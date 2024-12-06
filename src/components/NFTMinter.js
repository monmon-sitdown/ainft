import React, { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import FormData from "form-data";

// Generate an image and upload it to IPFS
const openAiApiKey = process.env.REACT_APP_OPENAI_API_KEY; //prefix must be REACT_APP
const apiKey = process.env.REACT_APP_JWT;

// Transform Base64 data to Blob
const base64ToBlob = (base64Data, contentType) => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

// mint NFT
const mintNFT = async (ipfsHash, userDescription) => {
  const metadata = {
    name: `GeneratedNFT-${userDescription.slice(0, 20)}`, // User the input content as the name
    description: `An NFT generated from AI based on the description: "${userDescription}"`, // User the input content as the description
    image: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
  };

  // Create JSON file and upload to IPFS
  const metadataBlob = new Blob([JSON.stringify(metadata)], {
    type: "application/json",
  });
  const form = new FormData();
  form.append(
    "file",
    metadataBlob,
    `metadata-${userDescription.slice(0, 20)}.json`
  ); // Use the generated name above

  const ipfsResponse = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    {
      headers: {
        "Content-Type": `multipart/form-data`,
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );
  console.log("Pinata json Response:", ipfsResponse.data);

  const metadataHash = ipfsResponse.data.IpfsHash;
  console.log("JSON Hash:", metadataHash);
  const tokenURI = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
  console.log(tokenURI);

  // mintNFT
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  const contractABI = [
    "function mint(address to, string memory tokenURI) external",
  ];
  console.log("Contract Address:", contractAddress);
  console.log("Contract ABI:", contractABI);

  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  const toAddress = await signer.getAddress();

  const tx = await contract.mint(toAddress, tokenURI);
  console.log("Transaction hash:", tx.hash);

  await tx.wait();
  console.log("NFT minted successfully!");
  return tx;
};

// NFTMinter
const NFTMinter = () => {
  const [userDescription, setDescription] = useState(""); // Description input by users
  const [ipfsHASH, setIpfsHash] = useState(""); // generated HASH of the image
  //const [imageURL, setImageURL] = useState(""); // generated image URL
  const [base64Image, setBase64Image] = useState(null);
  const [loading, setLoading] = useState(false); // Processing the loading status of generated image
  const [transactionHash, setTransactionHash] = useState(""); // Save the transacation hash

  const generateAndUploadImageToIPFS = async (userDescription) => {
    try {
      //console.log(apiKey);
      // generate the image
      const response = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          prompt: userDescription, // according the users description
          n: 1,
          size: "256x256",
          response_format: "b64_json",
        },
        {
          headers: {
            Authorization: `Bearer ${openAiApiKey}`, // OpenAI API key
          },
        }
      );

      const base64Data = response.data.data[0].b64_json;
      setBase64Image(base64Data); // show the generated image

      // Step 2: transform Base64 data to Blob
      const blob = base64ToBlob(base64Data, "image/png");

      // Step 3: Create FormData for uploading to IPFS
      const formData = new FormData();
      const nftName = `AINFT-${userDescription.slice(0, 20)}`; // Use the input by users as the name
      // When uploading, using the filename dynamically generated
      formData.append("file", blob, nftName + ".png"); // User the generated name as filename

      const pinataResponse = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            "Content-Type": `multipart/form-data`,
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      console.log("Pinata Response:", pinataResponse.data);

      const ipfsHash = pinataResponse.data.IpfsHash;
      console.log("IPFS Hash:", ipfsHash);

      return ipfsHash;
      // return the IPFS address
      //return `https://gateway.ipfs.io/ipfs/${ipfsHash}`;
      //return "????";
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  // Step one：Generated image and upload it to IPFS
  const handleGenerateImage = async () => {
    setLoading(true);
    try {
      // According the description, generated a image and upload it to IPFS, return IPFS URL
      const ipfsHash = await generateAndUploadImageToIPFS(userDescription);
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`; // IPFS URL
      console.log(imageUrl);
      //setImageURL(imageUrl); // save image URL
      setIpfsHash(ipfsHash);
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2：mint NFT
  const handleMint = async () => {
    setLoading(true);
    try {
      // User the ipfs URL of the image to mint NFT
      console.log(ipfsHASH);
      const tx = await mintNFT(ipfsHASH, userDescription); // mintNFT function should receive IPFS url of the image
      setTransactionHash(tx.hash); // record the transaction hash
    } catch (error) {
      console.error("Error minting NFT:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* User input description */}
      <input
        type="text"
        value={userDescription}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Enter a description"
        disabled={loading || base64Image} // If an image was generated, ban the text filling
      />
      {/* Button for generating image*/}
      <button onClick={handleGenerateImage} disabled={loading || base64Image}>
        {loading ? "Generating Image..." : "Generate Image"}
      </button>

      {/* Show the generated image */}
      {base64Image && (
        <div>
          <img
            src={`data:image/png;base64,${base64Image}`}
            alt="Generated NFT"
            style={{ width: "300px" }}
          />
          <div>
            {/* Ask user if he/she wants to mint NFT */}
            <p>Do you want to mint this image as an NFT?</p>
            <button onClick={handleMint} disabled={loading}>
              {loading ? "Minting..." : "Yes, Mint NFT"}
            </button>
            <button
              onClick={() => {}} // If they don't mint NFT, delete the image data and reset to default status
              disabled={loading}
            >
              No, Cancel
            </button>
          </div>
        </div>
      )}

      {/* Show the transaction hash */}
      {transactionHash && <p>Transaction Hash: {transactionHash}</p>}
    </div>
  );
};

export default NFTMinter;
