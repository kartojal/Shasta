import React, { Component } from "react";
import {
  Button,
  Dropdown,
  Card,
  Loader,
  Segment,
  Grid,
  Image,
  Message
} from "semantic-ui-react";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import blockies from 'ethereum-blockies-png';
//import icons
import solarOffIcon from "../../static/solar-energy-60x60-off.png";
import solarOnIcon from "../../static/solar-energy-60x60-on.png";
import eolicOffIcon from "../../static/eolic-energy-60x60-off.png";
import eolicOnIcon from "../../static/eolic-energy-60x60-on.png";
import biomassOffIcon from "../../static/boimass-energy-60x60-off.png";
import biomassOnIcon from "../../static/boimass-energy-60x60-on.png";
import otherOffIcon from "../../static/other-energy-60x60-off.png";
import otherOnIcon from "../../static/other-energy-60x60-on.png";
import nuclearOffIcon from "../../static/nuclear-energy-60x60-off.png";
import nuclearOnIcon from "../../static//nuclear-energy-60x60-on.png";

import "./Consumer.css";
import ipfs from "../../ipfs";
import withRawDrizzle from "../../utils/withRawDrizzle";
import { connect } from "react-redux";
import MyStep from "./stepper/MyStep";
import styled from "styled-components";
import _ from 'lodash';

// Styled components
const ShastaButton = styled(Button)`
  background-color: #423142 !important;
  border-radius: 8px !important;
  padding: 12px 25px !important;
  border: 0 !important;
`;

const Paragraphs = styled.div`
margin-top: 10px;
& > p {
  margin-top: 0px;
  margin-bottom: 5px;
}
`
const Address = styled.div`
  color: light-grey;
`

const AddressBlockie = styled.div`
  display: flex;
  align-items: center;
  & > ${Address} {
    margin-left: 5px;
  }
`

const Blockie = styled.img`
  border-radius: 4px;
`
const ShastaBuyButton = styled(Button)`
  background-color: white !important;
  border-radius: 8px !important;
  padding: 12px 25px !important;
  border-style: solid !important;
  border-color: gray !important;
  border-width: thin !important;
`;

const ShastaCard = styled(Card)`
  margin: 10px !important;
  border-radius: 0px 20px 20px 0px !important;
  border-left: 10px solid #f076b6 !important;
  box-shadow: 0px 1px 1px 1px #d4d4d5 !important;
`;

const FinalCard = styled(Card)`
  margin: 10px !important;
  padding: 10px !important;
  border-radius: 10px !important;
  border-left: 5px solid #f076b6 !important;
  box-shadow: 0px 1px 1px 1px #d4d4d5 !important;
`;

const ShastaGridRow = styled(Grid.Row)`
  border-left: 10px solid #f076b6 !important;
`;

const sources = [
  {
    key: 0,
    text: "Solar",
    value: "Solar",
    imgSrc: solarOffIcon,
    imgSrc2: solarOnIcon
  },
  {
    key: 1,
    text: "Nuclear",
    value: "Nuclear",
    imgSrc: nuclearOffIcon,
    imgSrc2: nuclearOnIcon
  },
  {
    key: 2,
    text: "Eolic",
    value: "Eolic",
    imgSrc: eolicOffIcon,
    imgSrc2: eolicOnIcon
  },
  {
    key: 3,
    text: "Biomass",
    value: "Biomass",
    imgSrc: biomassOffIcon,
    imgSrc2: biomassOnIcon
  },
  {
    key: 4,
    text: "Other",
    value: "Other",
    imgSrc: otherOffIcon,
    imgSrc2: otherOnIcon
  }
];

const sourcesIcons = selectedName => {
  return sources.map((source, i) => {
    let image = source.imgSrc;
    if (source.value === selectedName) {
      image = source.imgSrc2;
    }

    return (
      <Image
        key={i}
        style={{ width: "60px", height: "60px", padding: "10px 10px" }}
        src={image}
      />
    );
  });
};

const sourceIcon = selectedName => {
  const energySource = sources.find((source) => {
    return source.value === selectedName;
  });
  return (
    <Image
      style={{ width: "60px", height: "60px", padding: "10px 10px" }}
      src={energySource.imgSrc2}
    />
  );
};

const pricesRanges = [
  {
    text: "100 kWh",
    value: 100
  },
  {
    text: "200 kWh",
    value: 200
  },
  {
    text: "300 kWh",
    value: 300
  },
  {
    text: "400 kWh",
    value: 400
  },
  {
    text: "500 kWh",
    value: 500
  },
  {
    text: "600 kWh",
    value: 600
  }
];

class Consumer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      userJson: {
        consumerOffers: [],
        producerOffers: []
      },
      selectedContract: null,
      visible: false,
      percent: 0,
      ipfsHash: "",
      ipfsFirstName: "",
      ipfsAddress: "",
      address: "",
      producersOffersList: [],
      totalToPay: 0,
      filterSources: [],
      filterAmount: "",
      currentStep: 0,
      tx: null,
      amountSelected: false,
      messageVisibility: false
    };

    this.handleSourceClick = this.handleSourceClick.bind(this);
  }

  async componentDidMount() {
    const { drizzle, drizzleState, user } = this.props;
    const currentAccount = drizzleState.accounts[0];

    const web3 = drizzle.web3;
    const rawOrgName = web3.utils.utf8ToHex(user.organization);
    const rawHash = await drizzle.contracts.User.methods
      .getIpfsHashByUsername(rawOrgName)
      .call({ from: currentAccount });
    const ipfsHash = web3.utils.hexToUtf8(rawHash);
    const rawJson = await ipfs.cat(ipfsHash);
    this.setState({
      userJson: JSON.parse(rawJson)
    });
    this.getProducerOffers();
  }

  async getProducerOffers() {
    let checkedAddresses = [];

    const { drizzle, drizzleState } = this.props;
    const web3 = drizzle.web3;
    const currentAccount = drizzleState.accounts[0];
    const shastaMarketInstance = drizzle.contracts.ShastaMarket;
    const userContractInstance = drizzle.contracts.User;

    // Offers
    let producersOffersList = [];
    const offersLength = await shastaMarketInstance.methods
      .getOffersLength()
      .call({ from: currentAccount });
    let auxArray = Array.from(
      { length: Number.parseInt(offersLength) },
      (x, item) => item
    );

    auxArray.forEach(async (item, i) => {
      let userContract = await shastaMarketInstance.methods
        .getOfferFromIndex(i)
        .call({ from: currentAccount });
      let userAddress = userContract[1];
      if (!checkedAddresses.includes(userAddress)) {
        checkedAddresses.push(userAddress);
        let ipfsHashRaw = await userContractInstance.methods
          .getIpfsHashByAddress(userAddress)
          .call({ from: userAddress });
        let ipfsHash = web3.utils.hexToUtf8(ipfsHashRaw);

        let rawContent = await ipfs.cat(ipfsHash);
        let userData = JSON.parse(rawContent.toString("utf8"));

        for (let key in userData.producerOffers) {
          if (userData.producerOffers.hasOwnProperty(key)) {
            producersOffersList.push(userData.producerOffers[key]);
          }
        }

        this.setState({
          producersOffersList: producersOffersList.sort(
            (a, b) => a.energyPrice < b.energyPrice
          )
        });
      }
    });
  }

  handleChangefilterAmount = (e, data) => {
    this.setState({
      filterAmount: data.value,
      amountSelected: true,
      messageVisibility: false
    });
  };

  handleNextClick = () => {
    const current = this.state.currentStep;
    if (this.state.amountSelected) {
      if (current < 2) {
        this.setState({
          currentStep: current + 1
        });
      }
    } else {
      this.setState({
        messageVisibility: true
      });
    }
  };

  handleSourceClick = key => {
    let sourcesArray = this.state.filterSources;
    if (sourcesArray.includes(key)) {
      sourcesArray.splice(sourcesArray.indexOf(key), 1);
    } else {
      sourcesArray.push(key);
    }
    this.setState({
      filterSources: sourcesArray
    });
  };

  handleBackClick = () => {
    const current = this.state.currentStep;

    if (current > 0) {
      this.setState({
        currentStep: current - 1
      });
    }
  };

  handleOfferSelection = con => {
    if (this.state.amountSelected) {
      if (con && con.ethAddress) {
        this.setState({
          selectedContract: con,
          currentStep: 2
        });
      }
    } else {
      this.setState({
        messageVisibility: true
      });
    }
  };

  handleConfirmation = (con, avg, price, total) => {
    const ipfsContractMetadata = "";
    const ipfsBillMetadata = "";
    const { drizzle, drizzleState } = this.props;
    const web3 = drizzle.web3;
    const consumerAddress = drizzleState.accounts[0];
    const producerAddress = con.ethAddress;
    const tokenInstance = drizzle.contracts.ShaLedger;
    const billInstance = drizzle.contracts.BillSystem;
    const billInstanceWeb3 = new web3.eth.Contract(
      billInstance.abi,
      billInstance.address
    );

    const confirmContractAbi = billInstanceWeb3.methods
      .newPrepaidContract(
        tokenInstance.address,
        producerAddress,
        consumerAddress,
        price.toString(),
        avg.toString(),
        true,
        ipfsContractMetadata,
        ipfsBillMetadata
      )
      .encodeABI();
    const tx = tokenInstance.methods.approveAndCall.cacheSend(
      billInstance.address,
      total.toString(),
      confirmContractAbi,
      { from: consumerAddress }
    );

    this.setState({
      tx
    });
  };

  getContent = producerOffers => {
    const contract = this.state.selectedContract;
    const averageConsumerEnergy = this.state.filterAmount;
    switch (this.state.currentStep) {
      case 0:
        const sourcesColumns = sources.map((source, i) => {
          let image = source.imgSrc;
          if (this.state.filterSources.includes(i)) {
            image = source.imgSrc2;
          }

          return (
            <Grid.Column key={i}>
              <Image
                style={{ margin: "10px 10px", cursor: "pointer" }}
                src={image}
                onClick={() => this.handleSourceClick(i)}
              />
            </Grid.Column>
          );
        });

        return (
          <Grid className="filtersGrid">
            <Grid.Column style={{ width: "30%" }}>
              <div style={{ paddingBottom: 20 }}>
                <ShastaGridRow>
                  <div style={{ paddingLeft: 20 }}>
                    <h3>Amount of Energy:</h3>
                    <Dropdown
                      placeholder="Ammount of Energy"
                      fluid
                      selection
                      options={pricesRanges}
                      onChange={this.handleChangefilterAmount}
                    />
                  </div>
                </ShastaGridRow>
              </div>
              <Message color="red" hidden={!this.state.messageVisibility}>
                Select an amount of energy to buy please.
              </Message>
            </Grid.Column>
            <Grid.Column style={{ width: "50%" }}>
              <ShastaGridRow style={{ paddingBottom: 20 }}>
                <div style={{ paddingLeft: 20 }}>
                  <h3>Source of energy:</h3>
                  <div style={{ display: "flex" }}>{sourcesColumns}</div>
                </div>
              </ShastaGridRow>
              <Grid.Row style={{ paddingTop: 20 }}>
                <ShastaButton
                  style={{ float: "right" }}
                  primary
                  onClick={this.handleNextClick}
                >
                  Next
                </ShastaButton>
              </Grid.Row>
            </Grid.Column>
            <Grid.Row>
              <h3 style={{ width: "100%" }}>Best offer found: </h3>
              {producerOffers[0]}
            </Grid.Row>
          </Grid>
        );
      case 1:
        return (
          <div>
            <Grid>
              <Grid.Row>
                <Grid.Column width="16">
                  <h3>Offers: </h3>
                  <Card.Group>{producerOffers}</Card.Group>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row>
                <Grid.Column width="16">
                  <Button onClick={this.handleBackClick}>Back</Button>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </div>
        );
      case 2:
        const { tx } = this.state;
        const { drizzle, drizzleState } = this.props;
        const consumerAccount = drizzleState.accounts[0];
        const web3 = drizzle.web3;
        const energyPrice = contract.energyPrice;
        const priceRaw = web3.utils.toBN(
          web3.utils.toWei(energyPrice.toString(), "ether")
        );
        const avgRaw = web3.utils.toBN(averageConsumerEnergy);
        const totalRaw = priceRaw.mul(avgRaw);
        const totalPrice = web3.utils.fromWei(totalRaw, "ether");
        
        const ProviderBlockie = () => {
          const icon = blockies.createDataURL({ seed: contract.ethAddress });
          return (<Blockie src={icon} />);
        }
        const ConsumerBlockie = () => {
          const icon = blockies.createDataURL({ seed: consumerAccount });
          return (<Blockie src={icon} />);
        }
        let txStatus = "";
        if (drizzleState.transactionStack[tx]) {
          const txHash = drizzleState.transactionStack[tx];
          if (txHash && txHash in drizzleState.transactions) {
            const transaction = drizzleState.transactions[txHash];
            txStatus = transaction.status;
            if (txStatus == "error") {
              console.error(transaction.error);
            }
          }
        }
        return (
          <div>
            <h3>Confirm contract</h3>
            <FinalCard fluid color="purple" style={{maxWidth: '550px', 'position': 'relative'}}>
              <h3>Provider</h3>
              <AddressBlockie>
                <ProviderBlockie />
                <Address>{contract.ethAddress}</Address>
              </AddressBlockie>
              <Paragraphs>
                <p>Can provide up to {contract.amountkWh} kWh at {contract.energyPrice} SHA per kWh.</p>
                <p style={{marginTop: 10}}>Average monthly cost: {totalPrice} SHA for {averageConsumerEnergy} kWh</p>
                <p>Energy source: {contract.providerSource}</p>
              </Paragraphs>
              <div style={{position: 'absolute', top: 10, right: 10}}>
                {sourceIcon(contract.providerSource)}
              </div>
            </FinalCard>
            <FinalCard fluid color="purple" style={{maxWidth: '550px'}}>
              <h3>Consumer (You)</h3>
              <AddressBlockie>
                <ConsumerBlockie />
                <Address>{consumerAccount}</Address>
               </AddressBlockie>
            </FinalCard>
            <div style={{marginTop: 20}}>
              <p>
                Confirm below to accept the energy contract with Shasta, paying
                the first month beforehand in SHA token.
              </p>
            </div>
            <div style={{ paddingTop: 20, display: "flex" }}>
              <Button onClick={this.handleBackClick}>Back</Button>
              <Button
                primary
                disabled={txStatus !== ""}
                onClick={() =>
                  this.handleConfirmation(contract, avgRaw, priceRaw, totalRaw)
                }
              >
                Confirm contract
              </Button>
              {txStatus === "pending" && (
                <Loader active={true}>Pending transaction</Loader>
              )}
              {txStatus === "success" && (
                <Segment
                  color="green"
                  style={{
                    margin: 0,
                    padding: 5,
                    width: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Icon
                    icon="check"
                    color="green"
                    size="lg"
                    style={{ marginRight: 10 }}
                  />
                  Success
                </Segment>
              )}
              {txStatus === "error" && (
                <Segment color="red" style={{ width: 140 }}>
                  Some error ocurred while making the transaction. Please
                  contact with Shasta team if you consider that is a bug, via
                  email at hello@shasta.world
                </Segment>
              )}
            </div>
          </div>
        );
    }
  };

  render() {
    const { drizzleState } = this.props;
    const currentAccount = drizzleState.accounts[0];

    let producerOffers = this.state.producersOffersList.map(contract => {
      //filter your offers
      if (currentAccount === contract.ethAddress) {
        return "";
      }

      const sourceJson = sources.find(x => x.value === contract.providerSource);
      //filter source
      if (this.state.filterSources.length > 0) {
        if (!this.state.filterSources.includes(sourceJson.key)) {
          return "";
        }
      }
      //Filter by amount
      if (this.state.filterAmount !== "") {
        if (Number(contract.amountkWh) < this.state.filterAmount) {
          return "";
        }
      }
      return (
        <ShastaCard fluid color="purple" style={{width: '80%'}}>
          <Card.Content>
            <Card.Header>
              {contract.amountkWh} kWh at {contract.energyPrice} Shas/kWh
            </Card.Header>
            <Card.Description>
              Ethereum account: {contract.ethAddress}
            </Card.Description>
            <Card.Description>Address: {contract.address}</Card.Description>
          </Card.Content>
          <Card.Content extra>
            <Grid stackable columns={2}>
              <Grid.Column>
                <p>Source: {contract.providerSource}</p>
                <p>Total Price: {contract.fiatAmount} SHA</p>
                <ShastaBuyButton
                  onClick={() => this.handleOfferSelection(contract)}
                >
                  Buy Energy
                </ShastaBuyButton>
              </Grid.Column>
              <Grid.Column textAlign="right">
                {sourcesIcons(contract.providerSource)}
              </Grid.Column>
            </Grid>
          </Card.Content>
        </ShastaCard>
      );
    });

    //remove empty items
    producerOffers = producerOffers.filter(Boolean);

    return (
      <div>
        <MyStep step={this.state.currentStep} undo={this.handleBackClick} />
        {this.getContent(producerOffers)}
      </div>
    );
  }
}

function mapStateToProps(state, props) {
  return { user: state.userReducer };
}

export default withRawDrizzle(connect(mapStateToProps)(Consumer));
