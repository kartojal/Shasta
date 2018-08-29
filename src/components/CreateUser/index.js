import React, { Component } from 'react';
import { Button, Form, Grid, Image, Input} from 'semantic-ui-react'

import './index.css';
import shasta from './shasta.png'


class Index extends Component {

  constructor(props) {
    super(props);

    this.state = {
      username : ''
    }
    // This binding is necessary to make `this` work in the callback
    this.createUser = this.createUser.bind(this);
    this.updateInput = this.updateInput.bind(this);
  }

  //It should save a json file to ipfs and save the hash to the smart contract
  createUser() {

    console.log("Creating user " + this.state.username);

    var User = this.props.user;
    var username = this.state.username;
    var account = this.props.account;
    var ipfsHash = 'not-available';


    User.deployed().then(function(contractInstance) {
      contractInstance.createUser(username, ipfsHash, {gas: 200000, from: account}).then(function(success) {
        if(success) {
          console.log('created user ' + username + 'on ethereum!');

        } else {
          console.log('error creating user on ethereum. Maybe the user name already exists or you already have a user.');
        }
      }).catch(function(e) {
        console.log('error creating user:', username, ':', e);
      });

    });
  }


  updateInput(event){
    this.setState({username : event.target.value})
  }

  render() {
    return (
      <div className='home'>
        <Grid centered>
          <Grid.Row columns={2}>
            <Grid.Column>
              <Image src={shasta} />
            </Grid.Column>
            <Grid.Column style={{marginTop: '10%'}}>
              <Grid.Row>
                <Grid.Column>
                  <h1> Welcome to Shasta </h1>
                </Grid.Column>
                <Grid.Column style={{marginTop: '20px'}}>
                  <Form>
                    <Form.Field style={{marginRight: '450px'}}>
                      <p>Organization</p>
                      <Input placeholder='Username' onChange={this.updateInput}/>
                    </Form.Field>
                    <Button type='submit' onClick={this.createUser}>Create a new organization</Button>
                  </Form>
                </Grid.Column>
                <Grid.Column style={{marginTop: '100px'}}>
                  <h2>Status: {this.props.status}</h2>
                </Grid.Column>
                <Grid.Column></Grid.Column>
              </Grid.Row>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </div>
    );
  }
}

export default Index;