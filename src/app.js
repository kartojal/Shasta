import React from 'react';
import Router from "./routing.js";
import CreateUser from "./components/CreateUser/CreateUser.js";
import getWeb3 from './getWeb3.js'
import { default as contract } from 'truffle-contract'
import user_artifacts from 'shasta-os/build/contracts/User.json'
import shared_map_artifacts from 'shasta-os/build/contracts/SharedMapPrice.json'
import shasta_market_artifacts from 'shasta-os/build/contracts/ShastaMarket.json';

var userContract = contract(user_artifacts);
var sharedMapContract = contract(shared_map_artifacts);
var shastaMarketContract = contract(shasta_market_artifacts);
const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('ipfs.infura.io', '5001', { protocol: 'https' });

class App extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      web3: null,
      ipfs: null,
      address: '',
      balance: '',
      organizationName: '',
      ipfsFirstName: '',
      ipfsCountry: '',
      ipfsHash: '',
      ipfsValue: '',
      status: 'Not Connected!',
      userJson: '',
      bids: [],
      asks: []
    }
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
      .then(results => {
        this.setState({
          web3: results.web3
        })
        if (process.env.isTesting === true) {
          this.loadDemoEnvironment();
        } else {

          // set the provider for the User abstraction
          userContract.setProvider(results.web3.currentProvider);

          // set the provider for the SharedMap abstraction
          sharedMapContract.setProvider(results.web3.currentProvider);

          // set the provider for the ShastaMarket abstraction
          shastaMarketContract.setProvider(results.web3.currentProvider);
        }
        // Instantiate contract
        this.instantiateContract();

      })
      .catch((e) => {
        console.log('Error: ', e)
      })
  }

  loadDemoEnvironment() {
    const { userAddress, mapAddress, marketAddress } = process.env;
    userContract = this.state.web3.eth.contract(user_artifacts.abi).at(userAddress);
    sharedMapContract = this.state.web3.eth.contract(shared_map_artifacts.abi).at(mapAddress);
    shastaMarketContract = this.state.web3.eth.contract(shasta_market_artifacts.abi).at(marketAddress);
  }

  instantiateContract() {
    // Get accounts and start IPFS
    this.state.web3.eth.getAccounts((error, accounts) => {

      //init ipfs client
      ipfs.id(function (err, res) {
        if (err) throw err
        console.log('Connected to IPFS node!', res.id, res.agentVersion, res.protocolVersion);

      });
      this.setState({
        ipfs: ipfs
      })

      this.state.web3.eth.getBalance(accounts[0], (error, balance) => {
        this.setState({
          address: accounts[0],
          balance: this.state.web3.fromWei(balance.toString(), 'ether'),
          status: 'Connected!'
        })
        //Authenticate the address from metamask
        this.checkAuthentication(accounts[0], this);
      })

    })
  }

  checkAuthentication(account, context) {
    //Check if address has user
    console.log("Validating with: ", account);
    userContract.deployed().then(function (contractInstance) {
      contractInstance.getIpfsHashByAddress.call(account, { from: account }).then((result) => {

        console.log("Stored ipfs hash: ", context.hex2a(result));

        if (context.hex2a(result)) {

          var ipfsHash = context.hex2a(result);

          var url = 'https://ipfs.io/ipfs/' + ipfsHash;
          console.log('getting user info from ', url);

          ipfs.cat(ipfsHash, (err, ipfsResponse) => {
            ipfsResponse = ipfsResponse.toString('utf8')
            ipfsResponse = JSON.parse(ipfsResponse)

            context.setState({
              organizationName: ipfsResponse.organization.name,
              ipfsFirstName: ipfsResponse.organization.firstName,
              ipfsCountry: ipfsResponse.organization.country,
              ipfsHash: ipfsHash,
              userJson: ipfsResponse
            })
          })
        }
      }).catch(function (e) {
        console.log(e);
      });

    });
  }

  hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 2; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
  }

  render() {
    const {
      web3,
      address,
      status,
      balance,
      organizationName,
      ipfs,
      ipfsHash,
      ipfsFirstName,
      ipfsCountry,
      ipfsValue,
      userJson
    } = this.state

    if (this.state.organizationName) {
      return (
        <div>
          <Router
            web3={web3}
            address={address}
            balance={balance}
            organizationName={organizationName}
            ipfs={this.state.ipfs}
            contract={userContract}
            sharedMapContract={sharedMapContract}
            shastaMarketContract={shastaMarketContract}
            ipfsHash={ipfsHash}
            ipfsFirstName={ipfsFirstName}
            ipfsCountry={ipfsCountry}
            ipfsValue={ipfsValue}
            userJson={userJson}
          >
          </Router>
        </div>
      );
    } else {
      return (
        <div><CreateUser
          web3={web3}
          userContract={userContract}
          account={address}
          status={status}
          balance={balance}
          ipfs={ipfs}>
        </CreateUser></div>
      );
    }
  }
}

export default App;
