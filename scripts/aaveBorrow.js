const { getNamedAccounts } = require("hardhat")
const { getWeth } = require("../scripts/getWeth")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    // interacting with aave
    // need abi, contract address
    // aave actually have a contract, which will point us to the correct contract
    // we will be lending with lending pool (see aave docs)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
