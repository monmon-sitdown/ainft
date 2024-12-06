import React, { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import FormData from "form-data";

// 生成并上传图片到IPFS
const openAiApiKey = process.env.OPENAI_API_KEY;
const apiKey = process.env.INFURA_API_KEY;

const generateAndUploadImageToIPFS = async (userDescription) => {
  try {
    // 生成图片
    const response = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        prompt: userDescription, // 根据用户输入的描述生成
        n: 1,
        size: "256x256",
      },
      {
        headers: {
          Authorization: `Bearer ${openAiApiKey}`, // 替换为你的OpenAI API密钥
          "Content-Type": "application/json",
        },
      }
    );

    const imageUrl = response.data.data[0].url;

    // 从URL获取图片的二进制数据
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });

    // 将图片上传到IPFS
    const form = new FormData();
    form.append("file", imageResponse.data, {
      filename: "image.png",
    });

    const ipfsResponse = await axios.post(
      "https://ipfs.infura.io:5001/api/v0/add",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString(
            "base64"
          )}`,
        },
      }
    );

    const ipfsHash = ipfsResponse.data.Hash;
    console.log("IPFS Hash:", ipfsHash);

    // 返回图片的IPFS地址
    //return `https://gateway.ipfs.io/ipfs/${ipfsHash}`;
    return ipfsHash;
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// 铸造NFT
const mintNFT = async (ipfsHash, userDescription) => {
  const metadata = {
    name: `Generated NFT - ${userDescription.slice(0, 20)}...`, // 使用用户输入作为名称
    description: `An NFT generated from AI based on the description: "${userDescription}"`, // 动态描述
    image: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
  };

  // 创建JSON文件并上传到IPFS
  const form = new FormData();
  form.append("file", Buffer.from(JSON.stringify(metadata)), {
    filename: "metadata.json",
    contentType: "application/json",
  });

  const ipfsResponse = await axios.post(
    "https://ipfs.infura.io:5001/api/v0/add",
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      },
    }
  );

  const metadataHash = ipfsResponse.data.Hash;
  const tokenURI = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;

  // 铸造NFT
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  const contractAddress = process.env.CONTRACT_ADDRESS;
  const contractABI = [
    "function mint(address to, string memory tokenURI) external",
  ];

  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  const toAddress = await signer.getAddress();

  const tx = await contract.mint(toAddress, tokenURI);
  console.log("Transaction hash:", tx.hash);

  await tx.wait();
  console.log("NFT minted successfully!");
};

// NFTMinter组件
const NFTMinter = () => {
  const [userDescription, setDescription] = useState(""); // 用户输入的描述
  const [ipfsHASH, setIpfsHash] = useState(""); // 生成的图片 URL
  const [imageURL, setImageURL] = useState(""); // 生成的图片 URL
  const [loading, setLoading] = useState(false); // 处理生成图片的加载状态
  const [transactionHash, setTransactionHash] = useState(""); // 存储交易哈希

  // 第一步：生成图片并上传到IPFS
  const handleGenerateImage = async () => {
    setLoading(true);
    try {
      // 根据描述生成并上传图片到IPFS，返回IPFS URL
      const ipfsHash = await generateAndUploadImageToIPFS(userDescription);
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`; // IPFS URL
      setImageURL(imageUrl); // 保存生成的图片URL
      setIpfsHash(ipfsHash);
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setLoading(false);
    }
  };

  // 第二步：铸造NFT
  const handleMint = async () => {
    if (!imageURL) return; // 确保有图片生成
    setLoading(true);
    try {
      // 使用图片的IPFS URL铸造NFT
      const tx = await mintNFT(ipfsHASH); // mintNFT函数应该接受图片的IPFS URL
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
        disabled={loading || imageURL} // 如果图片已生成，禁用输入框
      />
      {/* 生成图片按钮 */}
      <button onClick={handleGenerateImage} disabled={loading || imageURL}>
        {loading ? "Generating Image..." : "Generate Image"}
      </button>

      {/* 显示生成的图片 */}
      {imageURL && (
        <div>
          <img
            src={imageURL}
            alt="Generated NFT"
            style={{ maxWidth: "300px" }}
          />
          <div>
            {/* 询问用户是否铸造NFT */}
            <p>Do you want to mint this image as an NFT?</p>
            <button onClick={handleMint} disabled={loading}>
              {loading ? "Minting..." : "Yes, Mint NFT"}
            </button>
            <button
              onClick={() => setImageURL("")} // 如果选择不mint，则清除图片并重置状态
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
