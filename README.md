# AI NFT Minter DApp

This is a decentralized application (DApp) that allows users to generate images using OpenAI's image generation model, upload them to IPFS through Pinata, and mint them as NFTs on the Ethereum blockchain.

## Features

- Generate images based on user-provided descriptions using OpenAI's API.
- Upload generated images to IPFS using Pinata.
- Mint NFTs using the uploaded images as metadata.

## Technologies Used

- **React**: Frontend framework for building the user interface.
- **OpenAI API**: For generating images based on user prompts.
- **Pinata**: For uploading images to IPFS.
- **Ethers.js**: For interacting with the Ethereum blockchain.
- **FormData**: For handling file uploads

## Usage

If you want to interact with the DApp, you need to make sure that you are able to connect your Web3 wallet to sepolia testnet.

- Enter a description in the input field.
- Click "Generate Image" to create an image. (You may wait for a while.)
- After the image is generated, you can choose to mint it as an NFT.(You may wait for a while, too)
