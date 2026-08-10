export const uploadFileToPinata = async (file: File): Promise<string> => {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  
  const data = new FormData();
  data.append("file", file);

  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) {
    throw new Error("Pinata JWT is missing in environment variables.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: data,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Error uploading to Pinata: ${errorData.error || response.statusText}`);
  }

  const resData = await response.json();
  return `ipfs://${resData.IpfsHash}`;
};

export const uploadJsonToPinata = async (jsonData: any): Promise<string> => {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) {
    throw new Error("Pinata JWT is missing in environment variables.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(jsonData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Error uploading JSON to Pinata: ${errorData.error || response.statusText}`);
  }

  const resData = await response.json();
  return `ipfs://${resData.IpfsHash}`;
};
