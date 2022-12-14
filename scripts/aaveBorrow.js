const { getNamedAccounts, ethers, network } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")
const { networkConfig } = require("../helper-hardhat-config")

const chainId = network.config.chainId

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
    await approveErc20(
        networkConfig[chainId]["wethTokenAddress"],
        lendingPool.address,
        AMOUNT,
        deployer
    )

    // depositing
    console.log(`depositing...`)
    // deposit parameters => address asset, uint256 amount, address onBehalfOf, uint16 referralCode
    // asset => address of the asset we are going to deposit
    // amount => how much of the asset
    // onBehalfOf => on behalf of ourselves
    // referralCode => 0 (has been discontinued)

    // when we deposit collateral we get aWeth tokens =>
    // They track how much web token we have deposited in the Aave Protocol
    // When we withdraw collateral back we burn Aave tokens
    // this aWeth is the interset bearing token
    await lendingPool.deposit(networkConfig[chainId]["wethTokenAddress"], AMOUNT, deployer, 0)
    console.log(`deposited`)

    // Time to Borrow
    // want to know more about our account
    //      how much we have borrowed
    //      how much we have in collateral
    //      how much we can borrow

    // solved by => getUserAccountData()
    // getUserAccountData => returns the users account data across all reserves, returns
    //      totalCollateralETH
    //      totDebtETH
    //      availableBorrowsETH
    //      currentLiquidationThreshold
    //      ltv => loan to value
    //      healthFactor => if it is below 1 => you get liquidated

    // aave incentivizes users to liquidate other users who pass liquidation threshold
    // liquidationCall()
    //      function to liquidate somebody
    //      build a bot to liquidate users who got insolvent and make a fee/reward for doing it

    let { availableBorrowsETH } = await getBorrowUserData(lendingPool, deployer)
    console.log(`availableBorrowsETH: ${availableBorrowsETH}`)

    // convert availableBorrowsETH from ETH to DAI
    // how much DAI can we borrow based on how much ETH we can borrow
    // Price Oracle => contract that can be used directly from aave
    //      1. checks for a price from Chainlink aggregator
    //      2. If price is below or equal to 0, call fallback price oracle maintained by Aave team
    //      3. In the future, Aave governance mechanisms will manage the selection of sources and the fallback price Oracle

    // calling directly from a Chainlink aggregator
    // DAI per ETH price
    const daiPrice = await getDaiPrice()
    console.log(`DAI price: ${daiPrice}`)
    // we don't want to hit the cap of maximum we can borrow => multiplying by 0.95
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toString())
    console.log(`You can borrow ${amountDaiToBorrow} DAI`)

    // getting the correct uints
    // dai token has 18 decimals so converting it to wei
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    console.log(`amountDaiToBorrow: ${amountDaiToBorrow}`)

    const daiTokenAddress = networkConfig[chainId]["daiTokenAddress"]
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getBorrowUserData(lendingPool, deployer)

    // after repaying the amountDaiToBorrowWei of Dai in Wei units we will still have some amount of ETH borrowed
    // This is because we accrued interset => we have to give more DAI
    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
    await getBorrowUserData(lendingPool, deployer)
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)

    // totalCollaterlETH increase secondtime because we gain interest
    console.log(`you have ${totalCollateralETH} worth of ETH deposited`)
    console.log(`you have ${totalDebtETH} worth of ETH borrowed`)
    console.log(`you can borrow ${availableBorrowsETH} worth of ETH`)

    return { availableBorrowsETH, totalDebtETH }
}

// we will pass deployer as the arguement
async function getLendingPool(account) {
    // abi, contract address
    // address => 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    // abi => from github repo or aave website

    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[chainId]["lendingPoolAddressesProviderAddress"],
        account
    )
    console.log(`LendingPoolAddressProvider address ${lendingPoolAddressesProvider.address}`)

    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()

    const lendingPool = ethers.getContractAt("ILendingPool", lendingPoolAddress, account)

    return lendingPool
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)

    console.log(`Approved!`)
}

async function getDaiPrice() {
    // don't need to connect to signer(deployer) since we are not going to send transactions
    // just going to be reading from the contract
    // reading => no signer
    // txn => signer
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[chainId]["priceFeedAddress"]
    )

    // return(uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)

    return price
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    // borrow(adddress asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log(`You've borrowed`)
}

// to repay we have to approve sending our DAI back to Aave
async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    // repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    console.log(`Repaid ${amount} of DAI in Wei`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
