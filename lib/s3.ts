import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type UploadDocumentInput = {
  body: Buffer;
  contentType: string;
  key: string;
};

let s3Client: S3Client | undefined;

export function getDocumentsBucket() {
  return process.env.AWS_S3_BUCKET ?? process.env.S3_BUCKET_NAME ?? "";
}

export function getDocumentsPrefix() {
  return process.env.KASA_DOCUMENTS_S3_PREFIX ?? "kasa-cue-documents";
}

export async function uploadDocumentToS3({
  body,
  contentType,
  key,
}: UploadDocumentInput) {
  const bucket = getDocumentsBucket();
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;

  if (!bucket || !region) {
    throw new Error(
      "S3 is not configured. Set AWS_S3_BUCKET and AWS_REGION in the environment."
    );
  }

  s3Client ??= new S3Client({ region });

  await s3Client.send(
    new PutObjectCommand({
      Body: body,
      Bucket: bucket,
      ContentType: contentType,
      Key: key,
    })
  );

  return { bucket, key };
}

export async function deleteDocumentFromS3({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) {
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;

  if (!bucket || !region) {
    throw new Error("S3 is not configured for document deletion.");
  }

  s3Client ??= new S3Client({ region });

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export async function downloadDocumentFromS3({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) {
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;

  if (!bucket || !region) {
    throw new Error("S3 is not configured for document download.");
  }

  s3Client ??= new S3Client({ region });

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  if (!response.Body) {
    return Buffer.alloc(0);
  }

  return Buffer.from(await response.Body.transformToByteArray());
}
