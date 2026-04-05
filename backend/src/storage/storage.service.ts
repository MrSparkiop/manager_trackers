import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { randomUUID } from 'crypto'

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name)
  private readonly s3: S3Client
  private readonly bucket: string

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || 'chat-audio'
    this.s3 = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      region: 'us-east-1', // MinIO ignores region but AWS SDK requires it
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true, // Required for MinIO
    })
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }))
      this.logger.log(`MinIO bucket "${this.bucket}" ready`)
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }))
        this.logger.log(`MinIO bucket "${this.bucket}" created`)
      } catch (err) {
        this.logger.warn(`MinIO unavailable — voice upload disabled: ${err}`)
      }
    }
  }

  /** Upload a buffer, return the object key */
  async uploadAudio(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
    const key = `voice/${Date.now()}-${randomUUID()}.${ext}`

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }))

    return key
  }

  /** Get a readable stream for an object */
  async getAudioStream(key: string): Promise<{ stream: Readable; contentType: string }> {
    const res = await this.s3.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }))

    return {
      stream: res.Body as Readable,
      contentType: res.ContentType || 'audio/webm',
    }
  }
}
