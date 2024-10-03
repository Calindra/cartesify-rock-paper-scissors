import { Request, Response } from 'express'
import {Challenge, Move} from './Challenge'
import { Hex, hexToString, toBytes} from 'viem';

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

let nextId:number = 0;
let playerChallenges = new Map<string, number>();
let challenges = new Map<string, Challenge>();

async function handle_create_challenge(payload, sender) {
    console.log(`Request received to create challenge ${payload.commitment}`);

    const commitment:string = payload.commitment;

    if(!commitment) {
      throw new Error("Move not chosen");
    }

    const challenge = new Challenge(nextId, sender, commitment)
    challenges.set(nextId.toString(), challenge);
    playerChallenges.set(sender, nextId);

    nextId++;

    const buffer = Buffer.from(`challenge with id ${nextId} was created by ${sender}`, "utf-8")
    const hexString = "0x" + buffer.toString('hex');

    console.log(`challenges saved ${challenges.size}`)

    const notice_res = await fetch(rollup_server + '/notice', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload: hexString })
    });
    const json = await notice_res.json();
    console.log("Received notice status " + notice_res.status + " with body " + JSON.stringify(json));

    return "accept";
}

async function handle_reveal(payload, sender) {
  console.log(`Request received to reveal move`);

  const nonce = payload.nonce;
  const move = payload.move

  const challengeId = playerChallenges.get(sender)

  if(challengeId == undefined) {
    return "reject"
  }

  const challenge:Challenge = challenges.get(challengeId.toString()) as Challenge

  try {
    challenge.reveal(sender, move, nonce)

    if (challenge.bothRevealed()) {
      const winner = challenge.evaluateWinner()

      if(!winner) {
        const buffer = Buffer.from(`challenge ${challengeId} ended in a draw`, "utf-8");
        const hexPayload: Hex = `0x${buffer.toString("hex")}`;
      
        const notice_res = await fetch(rollup_server + '/notice', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ payload: hexPayload })
        });

      }else {
        const buffer = Buffer.from(`challenge ${challengeId} was won by ${winner}`, "utf-8");
        const hexPayload: Hex = `0x${buffer.toString("hex")}`;
      
        const notice_res = await fetch(rollup_server + '/notice', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ payload: hexPayload })
        });
        
      }

      if (playerChallenges.get(challenge?.oponentAddress as string)) {
        playerChallenges.delete(challenge?.oponentAddress as string)
      }

      if (playerChallenges.get(challenge?.creatorAddress as string)) {
          playerChallenges.delete(challenge?.creatorAddress as string)
      }
    }

    return "accept"
  } catch(e) {
    console.log("Error is ", e)
    return "reject"
  }

}

async function handle_accept_challenge(payload, sender) {

  console.log(`Request received to create challenge ${payload.commitment}`);

  const commitment:string = payload.commitment;
  const challengeId: string = payload.challengeId;

  const challenge = challenges.get(challengeId);
  
  if(!challenge) {
    const buffer = Buffer.from("Challenge not found", "utf-8");
    const hexPayload: Hex = `0x${buffer.toString("hex")}`;

    const report_res = await fetch(rollup_server + '/report', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload: hexPayload })
    });

    return "reject";
  }

  if(!commitment) {
    const buffer = Buffer.from("Commitment not found", "utf-8");
    const hexPayload: Hex = `0x${buffer.toString("hex")}`;

    const report_res = await fetch(rollup_server + '/report', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload: hexPayload })
    });

    return "reject";
  }

  if(playerChallenges.get(sender)) {
    const buffer = Buffer.from("Player is already in a challenge", "utf-8");
    const hexPayload: Hex = `0x${buffer.toString("hex")}`;

    const report_res = await fetch(rollup_server + '/report', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload: hexPayload })
    });

    return "reject";
  }

  challenge.addOponent(sender, commitment);
  playerChallenges.set(sender, parseInt(challengeId));

  const buffer = Buffer.from(`challenge with id ${challengeId} was accepted by ${sender}`, "utf-8");
  const hexPayload: Hex = `0x${buffer.toString("hex")}`;

  const notice_res = await fetch(rollup_server + '/notice', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ payload: hexPayload })
  });

  return "accept"

}

async function handle_get_challenges(data) {
  console.log("Handling get_challenges")
  const challenge_keys = challenges.keys()
  let challengeList: Array<any> = []

  for (const challenge_id of challenge_keys) {
    console.log(`Adding ${challenge_id}`)
    let challenge:Challenge = challenges.get(challenge_id) as Challenge;
    
    let opponentMove:Move | undefined = undefined;

    if(challenge.oponentAddress) {
      opponentMove = challenge.commitments.get(challenge.oponentAddress) as Move
    }

    let creatorMove:Move = challenge.commitments.get(challenge.creatorAddress) as Move

    challengeList.push({
      "challenge_id": challenge_id,
      "creator": challenge.creatorAddress,
      "opponent": challenge.oponentAddress,
      "winner": challenge.winnerAddress,
      "opponent_committed":  opponentMove?.move,
      "opponent_move":  opponentMove?.move,
      "creator_move": creatorMove.move
    })

    const output = JSON.stringify({"challenges": challengeList})

    const buffer = Buffer.from(output)
    const hexString = "0x" + buffer.toString('hex');

    const report_res = await fetch(rollup_server + '/report', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload: hexString })
    });

    return "accept"
  }
}

async function handle_inspect(data) {
  const payloadBytes = data["payload"];
  const payloadStr = hexToString(payloadBytes)
  const payload = JSON.parse(payloadStr)

  const method = payload["method"]

  console.log(`Received inspect request data ${payloadStr}, method ${method}`)

  const handler = inspectHandlers[method]

  if(!handler) {
    return "reject"
  }


  return handler(data)
}

async function handle_advance(data) {
  const payloadBytes = data["payload"];
  const payloadStr = hexToString(payloadBytes)
  const payload = JSON.parse(payloadStr)

  const method = payload["method"]
  const sender = data["metadata"]["msg_sender"]

  console.log(`Received advance request data ${payloadStr}, method ${method}`)

  const handler = advanceHandlers[method]

  if(!handler) {
    return "reject"
  }

  return handler(payload, sender)

}

var handlers = {
    inspect_state: handle_inspect,
    advance_state: handle_advance,
}


var advanceHandlers = {
  create_challenge: handle_create_challenge,
  reveal: handle_reveal,
  accept_challenge: handle_accept_challenge, 
}

var inspectHandlers = {
  get_challenges: handle_get_challenges,
}

var finish = { status: "accept" };

(async () => {
    while (true) {
        console.log("Sending finish")

        const finish_req = await fetch(rollup_server + '/finish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'accept' })
        });

        console.log("Received finish status " + finish_req.status);


        if (finish_req.status == 202) {
          console.log("No pending rollup request, trying again");
      } else {
          const rollup_req = await finish_req.json();
          var handler = handlers[rollup_req["request_type"]];
          finish["status"] = await handler(rollup_req["data"]);

      }
    }
})();