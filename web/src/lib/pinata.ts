/**
 * Pinata IPFS upload helper.
 * Set PINATA_JWT in your .env.local from https://app.pinata.cloud
 */

export interface PinataMetadata {
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
}

/**
 * Uploads a file (e.g. image) to Pinata IPFS and returns the IPFS URI.
 * This is a server-side only call (uses PINATA_JWT secret).
 */
export async function uploadFileToPinata(file: File): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT is not set in .env.local");

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${err}`);
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Uploads a JSON metadata object to Pinata and returns the IPFS URI.
 */
export async function uploadMetadataToPinata(
  metadata: PinataMetadata
): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT is not set in .env.local");

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinataContent: metadata }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata metadata upload failed: ${err}`);
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Converts an ipfs:// URI to an HTTP gateway URL for display.
 */
export function ipfsToHttp(uri: string): string {
  const gateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
  return uri.replace("ipfs://", `${gateway}/ipfs/`);
}
