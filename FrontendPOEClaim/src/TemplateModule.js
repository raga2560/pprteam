/* eslint-disable */
// React and Semantic UI elements.
import React, { useState, useEffect } from 'react';
import { Feed, Form, Input, Grid, Message } from 'semantic-ui-react';

// Pre-built Substrate front-end utilities for connecting to a node
// and making a transaction.
import { useSubstrate } from './substrate-lib';

import { TxButton } from './substrate-lib/components';

// Polkadot-JS utilities for hashing data.
import { blake2AsHex } from '@polkadot/util-crypto';
const FILTERED_EVENTS = [
  'system:ExtrinsicSuccess::(phase={"applyExtrinsic":0})'
];

const eventName = ev => `${ev.section}:${ev.method}`;
const eventParams = ev => JSON.stringify(ev.data);


// Main Proof Of Existence component is exported.
export function Main (props) {
  // Establish an API to talk to the Substrate node.
  const { api } = useSubstrate();
   const [eventFeed, setEventFeed] = useState([]);

  // Get the selected user from the `AccountSelector` component.
  const { accountPair } = props;
  const [currentValue, setCurrentValue] = useState(0);

  const [formValue, setFormValue] = useState(0);
   const [status, setStatus] = useState('');
  const [digest, setDigest] = useState('');
  const [lock, setLock] = useState('');

  const [lockowner, setLockowner] = useState('');
  const [lockvalue, setLockvalue] = useState('');
  const [owner, setOwner] = useState('');
  const [block, setBlock] = useState(0);
  // Our `FileReader()` which is accessible from our functions below.

  let fileReader;
  // Takes our file, and creates a digest using the Blake2 256 hash function
  const bufferToDigest = () => {
    // Turns the file content to a hexadecimal representation.
    const content = Array.from(new Uint8Array(fileReader.result))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const hash = blake2AsHex(content, 256);
    setDigest(hash);
  };

// Callback function for when a new file is selected.
  const handleFileChosen = file => {
    fileReader = new FileReader();
    fileReader.onloadend = bufferToDigest;
    fileReader.readAsArrayBuffer(file);
  };

   useEffect(() => {
    let unsub = null;
    let keyNum = 0;
    const allEvents = async () => {
      unsub = await api.query.system.events(events => {
        // loop through the Vec<EventRecord>
        events.forEach(record => {
          // extract the phase, event and the event types
          const { event, phase } = record;

          // show what we are busy with
          const evHuman = event.toHuman();
          const evName = eventName(evHuman);
          const evParams = eventParams(evHuman);
          const evNamePhase = `${evName}::(phase=${phase.toString()})`;

          if (FILTERED_EVENTS.includes(evNamePhase)) return;
  setEventFeed(e => [{
            key: keyNum,
            icon: 'bell',
            summary: evName,
            content: evParams
          }, ...e]);

          keyNum += 1;
        });
      });
    };
   allEvents();
    return () => unsub && unsub();
  }, [api.query.system]);

  // React hooks for all the state variables we track.
  // Learn more at: https://reactjs.org/docs/hooks-intro.html
  useEffect(() => {
    let unsubscribe;
    api.query.templateModule.proofs(digest, newValue => {
      // The storage value is an Option<u32>
      // So we have to check whether it is None first
      // There is also unwrapOr
	      setOwner(newValue[0].toString());
        setBlock(newValue[1].toNumber());

    }).then(unsub => {
      unsubscribe = unsub;
    })
      .catch(console.error);

    return () => unsubscribe && unsubscribe();
  }, [digest, api.query.templateModule]);

  useEffect(() => {
    let unsubscribe;
    api.query.templateModule.prooflocks(digest, newValue => {
      // The storage value is an Option<u32>
      // So we have to check whether it is None first
      // There is also unwrapOr
        setLockowner(newValue[0].toString());
        setLockvalue(newValue[1].toString());

    }).then(unsub => {
      unsubscribe = unsub;
    })
      .catch(console.error);

    return () => unsubscribe && unsubscribe();
  }, [digest, api.query.templateModule]);
   // We can say a file digest is claimed if the stored block number is not 0
  function isClaimed () {
    return block !== 0;
  }


  // We can say a file digest is claimed if the stored block number is not 0

  // The actual UI elements which are returned from our component.
  return (
    <Grid.Column width={8}>
      <h1>Proof of Existence</h1>
	  {/* Show warning or success message if the file is or is not claimed. */}
      <Form success={!!digest && !isClaimed()} warning={isClaimed()}>
        <Form.Field>
          {/* File selector with a callback to `handleFileChosen`. */}
          <Input
            type="file"
            id="file"
            label="Your File"
            onChange={e => handleFileChosen(e.target.files[0])}
          />
          {/* Show this message if the file is available to be claimed */}
          <Message success header="File Digest Unclaimed" content={digest} />
          {/* Show this message if the file is already claimed. */}
          <Message
            warning
            header="File Digest Claimed"
            list={[digest, `Owner: ${owner}`, `Block: ${block}`]}
          />
        </Form.Field>

        <Form.Field>
	  <label>
            Enter lock :
            <input
              name="lock"
              type="text"
              value={lock}
              onChange={(e)=> setLock(e.target.value)}
            />
          <Message
            warning
            header="File Digest locked"
            list={[digest, `Owner: ${lockowner}`, `Lock: ${lockvalue}`]}
          />
          </label>

        </Form.Field>

	   {/* Buttons for interacting with the component. */}
        <Form.Field>
          {/* Button to create a claim. Only active if a file is selected, and not already claimed. Updates the `status`. */}
          <TxButton
            accountPair={accountPair}
            label={'Create Claim'}
            setStatus={setStatus}
            type="SIGNED-TX"
            disabled={isClaimed() || !digest}
            attrs={{
              palletRpc: 'templateModule',
              callable: 'createClaim',
              inputParams: [digest],
              paramFields: [true]
            }}
          />

          {/* Button to overwrite claim. Only active if a file is selected, and not already claimed. Updates the `status`. */}
          <TxButton
            accountPair={accountPair}
            label={'Update Claim'}
            setStatus={setStatus}
            type="SIGNED-TX"
            disabled={!isClaimed() || !digest}
            attrs={{
              palletRpc: 'templateModule',
              callable: 'updateClaim',
              inputParams: [digest, lock],
              paramFields: [true, true]
            }}
          />

          <TxButton
            accountPair={accountPair}
            label={'Lock Claim'}
            setStatus={setStatus}
            type="SIGNED-TX"
            disabled={!isClaimed() || !digest}
            attrs={{
              palletRpc: 'templateModule',
              callable: 'lockClaim',
              inputParams: [digest, lock],
              paramFields: [true, true]
            }}
          />
	   {/* Button to revoke a claim. Only active if a file is selected, and is already claimed. Updates the `status`. */}
          <TxButton
            accountPair={accountPair}
            label="Revoke Claim"
            setStatus={setStatus}
            type="SIGNED-TX"
            disabled={!isClaimed() || owner !== accountPair.address}
            attrs={{
              palletRpc: 'templateModule',
              callable: 'revokeClaim',
              inputParams: [digest],
              paramFields: [true]
            }}
          />
        </Form.Field>
        {/* Status message about the transaction. */}

   <div style={{ overflowWrap: 'break-word' }}>{status}</div>
    <Feed style={{ clear: 'both', overflow: 'auto', maxHeight: 100 }} events={eventFeed} />
      </Form>

    </Grid.Column>
  );
}

export default function TemplateModule (props) {
  const { api } = useSubstrate();
  return api.query.templateModule && api.query.templateModule.proofs
    ? <Main {...props} />
    : null;
}
