import {useState} from "react";
import { useToast, Heading, Select, Button } from "@chakra-ui/react";
import { generateCommitment } from "./util";
import { MOVE_KEY, NONCE_KEY } from "./constants";
import { submitTransaction } from "./CartesiTransaction";

function Challenges({challenges, address, signer, showAccept=false}) {
    const toast = useToast()
    const [choice, setChoice] = useState(1)
    const [acceptLoading, setAcceptLoading] = useState(false)
    const [revealLoading, setRevealLoading] = useState(false)


    const isAddressUser = (addr) => {
        if(addr === address) {
            return <strong style={{color: "green"}}>You</strong>
        } else {
            return <strong style={{color: "red"}}>Opponent</strong>
        }
    }

    const moveToString = (move) => {
        return {
            0: "HIDDEN",
            1: "ROCK",
            2: "PAPER",
            3: "SCISSORS"
        }[move]
    }

    const showReveal = (challenge) => {
        if(challenge.opponent === address && challenge.opponent_move !== 0) return false;
        if(challenge.creator === address && challenge.creator_move !== 0) return false;

        return (
            challenge.opponent_move !== undefined &&
            challenge.creator_move !== undefined &&
            !challenge.winner
        )
        
    }

    const sendRevealMoveTransaction = async (nonce, move) => {

        let payload:any = {
            "method": "reveal",
            "nonce": nonce,
            "move": move
        }

        return submitTransaction(payload, signer)
    }

    const revealMove = async () => {
        const nonce = localStorage.getItem(NONCE_KEY + address)
        const move = localStorage.getItem(MOVE_KEY + address)

        toast({
            title: "Transaction sent",
            description: "waiting for confirmation",
            status: "success",
            duration: 9000,
            isClosable: true,
            position: "top-left"
        })

        setRevealLoading(true);

        
        const response = await sendRevealMoveTransaction(nonce, move)


        setRevealLoading(false);

        if(response.id) {
            toast({
                title: "Confirmed",
                description: `Move Revealed successfully`,
                status: "success",
                duration: 9000,
                isClosable: true,
                position: "top-left"
            })
        } else {
            toast({
                title: "Error",
                description: `Move was not revealed`,
                status: "error",
                duration: 9000,
                isClosable: true,
                position: "top-left"
            })
        }

    }

 
    const sendAcceptTransaction = async (id) => {
        const commitment = await generateCommitment(choice, signer)

        let payload:any = {
            "method": "accept_challenge",
            "commitment": commitment,
            "challengeId": id
        }

        return submitTransaction(payload, signer)
    }

    const acceptChallenge = async (id) => {
      
        toast({
            title: "Transaction sent",
            description: "waiting for confirmation",
            status: "success",
            duration: 9000,
            isClosable: true,
            position: "top-left"
        })

        setAcceptLoading(true);

        const response = await sendAcceptTransaction(id)

        setAcceptLoading(false);

        if(response.id) {
            toast({
                title: "Confirmed",
                description: `Challenge accepted successfully`,
                status: "success",
                duration: 9000,
                isClosable: true,
                position: "top-left"
            })
        } else {
            toast({
                title: "Error",
                description: `Challenge was not accepted`,
                status: "error",
                duration: 9000,
                isClosable: true,
                position: "top-left"
            })
        }
        
    }

    const challengeDone = (challenge) => {
        return challenge.winner != undefined || (challenge.opponent_move !== '0' && challenge.creator_move !== '0')
    }

    let buttonAcceptProps:any = {}
    if(acceptLoading) buttonAcceptProps.isLoading = true

    let buttonRevealProps:any = {}
    if(revealLoading) buttonRevealProps.isLoading = true

    return (
        <div className="challenges">
            { 
                challenges.map( (challenge) => {

                    let data = {
                        opponentMove: "",
                        yourMove: "",
                        opponent: ""
                    }


                    if(challenge.creator === address) {
                        data = {
                            opponentMove: challenge.opponent_move,
                            yourMove: challenge.creator_move,
                            opponent: challenge.opponent
                        }
                    } else {
                        data = {
                            opponentMove: challenge.creator_move,
                            yourMove: challenge.opponent_move,
                            opponent: challenge.creator
                        }
                    }

                    return <div className="challenge" key={challenge.challenge_id}>
                        <Heading>Challenge #{challenge.challenge_id}</Heading>
                        {data.opponent && (
                            <p><strong>Opponent</strong>: {data.opponent}</p>
                        )}

                        {challenge.winner && (
                            <p><strong>Winner</strong>: {isAddressUser(challenge.winner)}</p>
                        )}

                        {!challenge.winner && challengeDone(challenge) && (
                            <p><strong>Result</strong>: <strong style={{color: "yellow"}}>Draw</strong></p>
                        )}

                        { data.opponentMove != undefined && (
                            <p><strong>Opponent Move: </strong>{" "}{moveToString(data.opponentMove)}</p>
                        )}


                        { data.yourMove != undefined && (
                            <p><strong>Your Move: </strong>{" "}{moveToString(data.yourMove)}</p>
                        )}

                        { showReveal(challenge) ?
                         <Button {...buttonRevealProps} colorScheme="green" onClick={() => revealMove()} >Reveal Move</Button>
                        : !challengeDone(challenge) ? <p>Waiting ...</p> : <></>
                        }

                        { showAccept && <>
                            <Select focusBorderColor="yellow"
                             size="md" 
                             value={choice}
                             onChange={(e) => setChoice(parseInt(e.target.value))}>
                    <option value="1">ROCK</option>
                    <option value="2">PAPER</option>
                    <option value="3">SCISSORS</option>
                            </Select>
                            <Button {...buttonAcceptProps} onClick={() => {acceptChallenge(challenge.challenge_id)}} colorScheme="green">
                                Accept Challenge
                            </Button>
                        </>}

                    </div>
                })
                
        
            }
        </div>
    )
}

export default Challenges