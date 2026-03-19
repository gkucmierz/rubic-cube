import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
    console.error('Usage: node split.js <directory> [files_per_folder]');
    console.log('Example: node split.js ./my-images 500');
    process.exit(1);
}

const targetDir = path.resolve(args[0]);
const filesPerFolder = args[1] ? parseInt(args[1], 10) : 1000;

if (isNaN(filesPerFolder) || filesPerFolder <= 0) {
    console.error('Error: files_per_folder must be a positive integer');
    process.exit(1);
}

if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory not found: ${targetDir}`);
    process.exit(1);
}

if (!fs.lstatSync(targetDir).isDirectory()) {
    console.error(`Error: Path is not a directory: ${targetDir}`);
    process.exit(1);
}

console.log(`Processing directory: ${targetDir}`);
console.log(`Splitting into folders of ${filesPerFolder} files...`);

try {
    // Read all files in the directory
    const files = fs.readdirSync(targetDir);

    // Filter for JPG files (case insensitive)
    const jpgFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.jpg' || ext === '.jpeg';
    });

    if (jpgFiles.length === 0) {
        console.log('No JPG files found in the specified directory.');
        process.exit(0);
    }

    console.log(`Found ${jpgFiles.length} JPG files.`);

    // Calculate number of folders needed
    const totalFolders = Math.ceil(jpgFiles.length / filesPerFolder);
    console.log(`Creating ${totalFolders} folders...`);

    let movedCount = 0;

    for (let i = 0; i < totalFolders; i++) {
        const folderName = `part_${i + 1}`;
        const folderPath = path.join(targetDir, folderName);

        // Create subfolder if it doesn't exist
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        // Get slice of files for this folder
        const start = i * filesPerFolder;
        const end = start + filesPerFolder;
        const batch = jpgFiles.slice(start, end);

        // Move files
        for (const file of batch) {
            const sourcePath = path.join(targetDir, file);
            const destPath = path.join(folderPath, file);

            fs.renameSync(sourcePath, destPath);
            movedCount++;
        }

        console.log(`Moved ${batch.length} files to ${folderName}`);
    }

    console.log(`Successfully organized ${movedCount} files into ${totalFolders} folders.`);

} catch (error) {
    console.error('An error occurred:', error.message);
    process.exit(1);
}
