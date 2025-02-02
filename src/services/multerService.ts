import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';

const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage: StorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

class MulterService {
    static uploadFile = upload.single('portada');

    static getFilePath(req: any): string | undefined {
        if (req.file) {
            return req.file.path;
        }
        return undefined;
    }
}

export default MulterService;