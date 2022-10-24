const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    // interacting with aave
    // need abi, contract address
    // aave actually have a contract, which will point us to the correct correct contract
    // contract for lending => lending pool
    // we will be lending with lending pool (see aave docs)
    // LendingPoolAddressProvider contract will provide contract address for lending pool contract

    // lendingPoolAddressProvider address => 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    // lending pool address

    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool address ${lendingPool.address}`)

    // deposit WETH
    // deposit in the lendingPool contract will eventually call safeTransferFrom which is equivalent to transferFrom
    // lendingPool contract will pull funds deposit function caller (msg.sender) wallet
    // to lendingPool contract be able to pull funds we need to approve it

    // approve to get our WETH token
    // getting WETH token
    const wethTokenAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)

    // depositing
    console.log(`depositing...`)
    // deposit parameters => address asset, uint256 amount, address onBehalfOf, uint16 referralCode
    // asset => address of the asset we are going to deposit
    // amount => how much of the asset
    // onBehalfOf => on behalf of ourselves
    // referralCode => 0 (has been discontinued)
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log(`deposited`)
}

// we will pass deployer as the arguement
async function getLendingPool(account) {
    // abi, contract address
    // address => 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    // abi => from github repo or aave website

    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    console.log(`LendingPoolAddressProvider address ${lendingPoolAddressesProvider.address}`)

    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    console.log(`lendingPool address ${lendingPoolAddress}`)

    const lendingPool = ethers.getContractAt("ILendingPool", lendingPoolAddress, account)

    return lendingPool
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)

    console.log(`Approved!`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
