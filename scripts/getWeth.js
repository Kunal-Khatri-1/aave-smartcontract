const { networkConfig } = require("../helper-hardhat-config")
const { network } = require("hardhat")

// not going to add main.then....
// creating it just like a module
// and importing it to aaveBorrow.js

const { getNamedAccounts, ethers } = require("hardhat")
const AMOUNT = ethers.utils.parseEther("0.02")

async function getWeth() {
    const chainId = network.config.chainId
    console.log(
        `chainId: ${chainId},   Object: ${networkConfig[chainId]},      ContractAddress: ${networkConfig[chainId]["wethTokenAddress"]}`
    )
    const { deployer } = await getNamedAccounts()

    // call the "deposit" function on the Weth contract
    // abi, Contract Address
    // 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

    // get contract at a specific address
    // get contract with abi IWeth and address 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 connected to deployer
    const iWeth = await ethers.getContractAt(
        "IWeth",
        networkConfig[chainId]["wethTokenAddress"],
        deployer
    )

    const tx = await iWeth.deposit({ value: AMOUNT })
    await tx.wait(1)

    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`Got ${wethBalance.toString()} WETH`)
}

module.exports = { getWeth, AMOUNT }
