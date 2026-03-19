import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from PIL import Image
import argparse
import copy

# Setup Device: MPS for Apple Silicon (M-series), CUDA for Nvidia, else CPU
if torch.backends.mps.is_available():
    device = torch.device("mps")
    print("Using Apple Silicon MPS acceleration!")
elif torch.cuda.is_available():
    device = torch.device("cuda")
    print("Using CUDA acceleration!")
else:
    device = torch.device("cpu")
    print("Using CPU. Training might be slow.")


class CubePoseDataset(Dataset):
    def __init__(self, data_dir, transform=None):
        self.data_dir = data_dir
        self.transform = transform
        self.samples = []

        labels_path = os.path.join(data_dir, 'labels.jsonl')
        if not os.path.exists(labels_path):
            raise FileNotFoundError(f"Missing {labels_path}. Did you run `node generate.js`?")

        with open(labels_path, 'r') as f:
            for line in f:
                if line.strip():
                    sample = json.loads(line)
                    img_path = os.path.join(data_dir, sample['image'])
                    if os.path.exists(img_path):
                        self.samples.append(sample)
                    else:
                        # Log but don't crash
                        pass

        if len(self.samples) == 0:
            raise RuntimeError(f"No valid images found in {data_dir}!")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        try:
            sample = self.samples[idx]
            img_path = os.path.join(self.data_dir, sample['image'])

            image = Image.open(img_path).convert('RGB')
            if self.transform:
                image = self.transform(image)

            # Extract Euler angles and normalize them to approximately [-1, 1]
            pitch = float(sample['pose']['pitch']) / 180.0
            yaw = float(sample['pose']['yaw']) / 180.0
            roll = float(sample['pose']['roll']) / 180.0

            # Extract Spatial Translation parameters
            x = float(sample['pose'].get('x', 0)) / 2.0
            y = float(sample['pose'].get('y', 0)) / 2.0
            scale = float(sample['pose'].get('scale', 1.0)) - 1.0

            detected = float(sample.get('detected', 1.0))

            target = torch.tensor([pitch, yaw, roll, x, y, scale, detected], dtype=torch.float32)
            return image, target
        except Exception as e:
            # If a file is corrupted or missing during training (e.g. while being overwritten)
            # just return the first sample as a placeholder to keep the batch size consistent
            if idx == 0:
                # If the first one fails, something is fundamentally wrong
                raise e
            return self.__getitem__(0)


def get_pose_model():
    """
    Builds a MobileNetV2 model adapted for 224x224 RGB inputs,
    with a custom regression head outputting [pitch, yaw, roll, x, y, scale, detected].
    """
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

    # Replace the classification head with a 7-value regression head
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(in_features, 7) # Output: P, Y, R, X, Y, Scale, Det
    )

    return model


def train_model(data_dir='./dataset'):
    # Standard MobileNetV2 transforms
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.3496, 0.2955, 0.1898], std=[0.3102, 0.2397, 0.2422])
    ])

    print(f"Loading dataset from {data_dir}...")
    dataset = CubePoseDataset(data_dir, transform=transform)
    print(f"Loaded {len(dataset)} samples.")

    # Split: 80% Train, 20% Val
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False, num_workers=0)

    model = get_pose_model().to(device)

    # Loss components
    mse_criterion = nn.MSELoss()
    bce_criterion = nn.BCEWithLogitsLoss()

    # Optimizer: Adam
    optimizer = optim.Adam(model.parameters(), lr=1e-3)

    # NEW: Learning Rate Scheduler (Lowers LR when Val Loss stalls)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=3)

    num_epochs = 50
    best_val_loss = float('inf')
    best_model_wts = copy.deepcopy(model.state_dict())

    print(f"\nStarting training for {num_epochs} Epochs...")

    try:
        for epoch in range(num_epochs):
            model.train()
            running_loss = 0.0

            for images, targets in train_loader:
                images, targets = images.to(device), targets.to(device)

                optimizer.zero_grad()
                outputs = model(images)

                # Detected flag loss (always calculated)
                loss_det = bce_criterion(outputs[:, 6], targets[:, 6])

                # Pose loss (only calculated for images where detected == 1)
                mask = targets[:, 6] == 1.0
                if mask.sum() > 0:
                    loss_pose = mse_criterion(outputs[mask, :6], targets[mask, :6])
                else:
                    loss_pose = 0.0

                loss = loss_pose + loss_det * 0.5 # Give detected flag moderate weighting

                loss.backward()
                optimizer.step()

                running_loss += loss.item() * images.size(0)

            epoch_train_loss = running_loss / len(train_dataset)

            # Validation Phase
            model.eval()
            val_loss = 0.0
            with torch.no_grad():
                for images, targets in val_loader:
                    images, targets = images.to(device), targets.to(device)
                    outputs = model(images)

                    loss_det = bce_criterion(outputs[:, 6], targets[:, 6])
                    mask = targets[:, 6] == 1.0
                    if mask.sum() > 0:
                        loss_pose = mse_criterion(outputs[mask, :6], targets[mask, :6])
                    else:
                        loss_pose = 0.0
                    loss = loss_pose + loss_det * 0.5

                    val_loss += loss.item() * images.size(0)

            epoch_val_loss = val_loss / len(val_dataset)

            print(f"Epoch {epoch+1:02d}/{num_epochs} | Train Loss: {epoch_train_loss:.4f} | Val Loss: {epoch_val_loss:.4f}")

            # Update Scheduler
            scheduler.step(epoch_val_loss)

            # Update Best Weights
            if epoch_val_loss < best_val_loss:
                best_val_loss = epoch_val_loss
                best_model_wts = copy.deepcopy(model.state_dict())
                print(f"   [OK] New Best Model (Val Loss: {best_val_loss:.4f})")

    except KeyboardInterrupt:
        print("\n\n [!] Training interrupted by user. Finalizing with best weights so far...")

    print("\nTraining Complete! Loading best weights...")
    model.load_state_dict(best_model_wts)
    return model

def export_to_onnx(model, filename="cube_pose_tracker.onnx"):
    print(f"\nExporting trained model to {filename}...")
    model.eval()

    # Dummy input tracing for ONNX
    dummy_input = torch.randn(1, 3, 224, 224, device=device)

    torch.onnx.export(
        model,
        dummy_input,
        filename,
        export_params=True,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )

    # Force inline weights for WebAssembly compatibility
    import onnx
    model_proto = onnx.load(filename)
    onnx.save_model(model_proto, filename)
    if os.path.exists(filename + ".data"):
        os.remove(filename + ".data")

    print(f"Success! Model exported to standard ONNX format, ready for WebGL inference.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Rubik’s Cube Pose Estimator')
    parser.add_argument('--data', type=str, default='./dataset', help='Path to dataset directory')
    args = parser.parse_args()

    try:
        trained_model = train_model(data_dir=args.data)
        export_to_onnx(trained_model)
    except Exception as e:
        print(f"Error during training pipeline: {e}")
