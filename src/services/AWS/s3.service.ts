import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

interface UploadResult {
    publicUrl: string;
    fileName: string;
}

interface S3Config {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
}

type ContentTypes = {
    [key: string]: string;
};

export class S3Service {
    private s3Client: S3Client;
    private bucket: string;
    private region: string;

    constructor() {
        const config: S3Config = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            region: process.env.AWS_REGION || '',
            bucket: process.env.AWS_BUCKET_NAME || ''
        };

        this.validateConfig(config);

        this.s3Client = new S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey
            }
        });

        this.bucket = config.bucket;
        this.region = config.region;
    }

    private validateConfig(config: S3Config): void {
        const missingVars: string[] = [];

        if (!config.accessKeyId) missingVars.push('AWS_ACCESS_KEY_ID');
        if (!config.secretAccessKey) missingVars.push('AWS_SECRET_ACCESS_KEY');
        if (!config.region) missingVars.push('AWS_REGION');
        if (!config.bucket) missingVars.push('AWS_BUCKET_NAME');

        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
    }

    async uploadImage(file: Buffer | ReadableStream, fileName: string): Promise<UploadResult> {
        try {
            const uploadCommand = new PutObjectCommand({
                Bucket: this.bucket,
                Key: fileName,
                Body: file,
                ContentType: this.getContentType(fileName)
                // Removido el ACL ya que no es soportado
            });

            await this.s3Client.send(uploadCommand);

            const publicUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileName}`;

            return {
                publicUrl,
                fileName
            };
        } catch (error) {
            console.error('Error al subir la imagen:', error);
            throw new Error('No se pudo subir la imagen a S3');
        }
    }

    async deleteImage(fileName: string): Promise<void> {
        try {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: fileName,
            });

            await this.s3Client.send(deleteCommand);
        } catch (error) {
            console.error('Error al eliminar la imagen:', error);
            throw new Error('No se pudo eliminar la imagen de S3');
        }
    }

    private getContentType(fileName: string): string {
        const contentTypes: ContentTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml'
        };

        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        return contentTypes[ext] || 'application/octet-stream';
    }
}