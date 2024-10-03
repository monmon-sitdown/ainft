import React, { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import FormData from "form-data";

// 生成并上传图片到IPFS
const openAiApiKey = process.env.REACT_APP_OPENAI_API_KEY; //必须加REACT_APP才能生效
const apiKey = process.env.REACT_APP_JWT;

// 将 Base64 数据转换为 Blob
const base64ToBlob = (base64Data, contentType) => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

// 铸造NFT
const mintNFT = async (ipfsHash, userDescription) => {
  const metadata = {
    name: `GeneratedNFT-${userDescription.slice(0, 20)}`, // 使用用户输入作为名称
    description: `An NFT generated from AI based on the description: "${userDescription}"`, // 动态描述
    image: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
  };

  // 创建JSON文件并上传到IPFS
  const metadataBlob = new Blob([JSON.stringify(metadata)], {
    type: "application/json",
  });
  const form = new FormData();
  form.append(
    "file",
    metadataBlob,
    `metadata-${userDescription.slice(0, 20)}.json`
  ); // 使用生成的名称

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

  // 铸造NFT
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

// NFTMinter组件
const NFTMinter = () => {
  const [userDescription, setDescription] = useState(""); // 用户输入的描述
  const [ipfsHASH, setIpfsHash] = useState(""); // 生成的图片 URL
  //const [imageURL, setImageURL] = useState(""); // 生成的图片 URL
  const [base64Image, setBase64Image] = useState(null);
  const [loading, setLoading] = useState(false); // 处理生成图片的加载状态
  const [transactionHash, setTransactionHash] = useState(""); // 存储交易哈希

  const generateAndUploadImageToIPFS = async (userDescription) => {
    try {
      //console.log(apiKey);
      // 生成图片
      const response = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          prompt: userDescription, // 根据用户输入的描述生成
          n: 1,
          size: "256x256",
          response_format: "b64_json",
        },
        {
          headers: {
            Authorization: `Bearer ${openAiApiKey}`, // OpenAI API密钥
          },
        }
      );

      const base64Data = response.data.data[0].b64_json;
      setBase64Image(base64Data); // 显示生成的图片

      // Step 2: 将 Base64 数据转换为 Blob
      const blob = base64ToBlob(base64Data, "image/png");

      // Step 3: 创建 FormData 以便上传到 IPFS
      const formData = new FormData();
      const nftName = `AINFT-${userDescription.slice(0, 20)}`; // 使用用户输入作为名称
      // 在上传时使用动态生成的文件名
      formData.append("file", blob, nftName + ".png"); // 使用生成的名称作为文件名

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
      // 返回图片的IPFS地址
      //return `https://gateway.ipfs.io/ipfs/${ipfsHash}`;
      //return "????";
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  // 第一步：生成图片并上传到IPFS
  const handleGenerateImage = async () => {
    setLoading(true);
    try {
      // 根据描述生成并上传图片到IPFS，返回IPFS URL
      const ipfsHash = await generateAndUploadImageToIPFS(userDescription);
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`; // IPFS URL
      console.log(imageUrl);
      //setImageURL(imageUrl); // 保存生成的图片URL
      setIpfsHash(ipfsHash);
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setLoading(false);
    }
  };

  // 第二步：铸造NFT
  const handleMint = async () => {
    setLoading(true);
    try {
      // 使用图片的IPFS URL铸造NFT
      console.log(ipfsHASH);
      const tx = await mintNFT(ipfsHASH, userDescription); // mintNFT函数应该接受图片的IPFS URL
      setTransactionHash(tx.hash); // 保存交易哈希
    } catch (error) {
      console.error("Error minting NFT:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 用户输入描述 */}
      <input
        type="text"
        value={userDescription}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Enter a description"
        disabled={loading || base64Image} // 如果图片已生成，禁用输入框
      />
      {/* 生成图片按钮 */}
      <button onClick={handleGenerateImage} disabled={loading || base64Image}>
        {loading ? "Generating Image..." : "Generate Image"}
      </button>

      {/* 显示生成的图片 */}
      {base64Image && (
        <div>
          <img
            src={`data:image/png;base64,${base64Image}`}
            alt="Generated NFT"
            style={{ width: "300px" }}
          />
          <div>
            {/* 询问用户是否铸造NFT */}
            <p>Do you want to mint this image as an NFT?</p>
            <button onClick={handleMint} disabled={loading}>
              {loading ? "Minting..." : "Yes, Mint NFT"}
            </button>
            <button
              onClick={() => {}} // 如果选择不mint，则清除图片并重置状态
              disabled={loading}
            >
              No, Cancel
            </button>
          </div>
        </div>
      )}

      {/* 显示交易哈希 */}
      {transactionHash && <p>Transaction Hash: {transactionHash}</p>}
    </div>
  );
};

export default NFTMinter;
