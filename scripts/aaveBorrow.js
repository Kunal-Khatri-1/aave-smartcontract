const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth } = require("../scripts/getWeth")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    // interacting with aave
    // need abi, contract address
    // aave actually have a contract, which will point us to the correct correct contract
    // contract for lending => lending pool
    // we will be lending with lending pool (see aave docs)
    // LendingPoolAddressProvider contract will provide contract address for lending pool contract

    // lendingPoolAddressProvider address => 0x5E52dEc931FFb32f609681B8438A51c675cc232d
    // lending pool address

    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool address ${lendingPool.address}`)
}

// we will pass deployer as the arguement
async function getLendingPool(account) {
    // abi, contract address
    // address => 0x5E52dEc931FFb32f609681B8438A51c675cc232d
    // abi => from github repo or aave website

    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0x5e52dec931ffb32f609681b8438a51c675cc232d",
        account
    )
    console.log(`LendingPoolAddressProvider address ${lendingPoolAddressesProvider.address}`)

    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    console.log(`lendingPool address ${lendingPoolAddress}`)

    const lendingPool = ethers.getContractAt("ILendingPool", lendingPoolAddress, account)

    return lendingPool
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
