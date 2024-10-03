import React, {useState, useEffect} from "react";
import { Button, Heading } from "@chakra-ui/react";
import Challenges from "./Challenges";
import { Cartesify } from "@calindra/cartesify";
import { ethers } from "ethers";

function ListChallenges({signer}) {
    const [currentChallenges, setCurrentChallenges] = useState<any[]>([])
    const [myChallenge, setMyChallenge] = useState(undefined)
    const [myOldChallenges, setMyOldChallenges] = useState<any[]>([])
    const [oldChallenges, setOldChallenges] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [address, setAddress] = useState("")

    useEffect(() => {
        signer?.getAddress().then(addr => setAddress(addr.toLowerCase()))
    }, [signer])

    useEffect(() => {
        getChallenges()
    }, [address])

    async function getChallenges() {
        if(!signer) {
            return
        }
        setLoading(true)

        let results;
    //    results = await inspect({"method": "get_challenges"})
    //     results = JSON.parse(hex2str(results[0].payload))["challenges"]
        let payload:any = {
            "method": "get_challenges",
        }

    const payloadJSON = JSON.stringify(payload)

        const response = await fetch(`http://localhost:8080/inspect/${payloadJSON}`)

        console.log(response.ok)
        results = await response.json();
        console.log(results) // will print the backend response as json     
        
        const currentChallenges: any[] = []
        let myChallenge = undefined
        const oldChallenges: any[] = []
        const myOldChallenges:any[] = []

        let challenges = []

        if(results.reports) {
            const report = ethers.toUtf8String(results.reports[0].payload)

            challenges = JSON.parse(report)['challenges']
        }

        console.log("challenges", challenges)

        if(challenges?.length > 0) {
            for (const challenge of challenges) {
                const userParticipated = challenge.opponent === address || challenge.creator === address
    
                if(challenge.winner && userParticipated) {
                    myOldChallenges.push(challenge)
                } else if(userParticipated) {
                    myChallenge = challenge
                } else if(challenge.winner) {
                    oldChallenges.push(challenge)
                } else {
                    currentChallenges.push(challenge)
                }
            }

            setCurrentChallenges(currentChallenges)
            setMyChallenge(myChallenge)
            setOldChallenges(oldChallenges)
            setMyOldChallenges(myOldChallenges)
        }

        setLoading(false)
        
    }

    let buttonProps:any = {}
    if (loading) buttonProps.isLoading = true

    if (!address) return <></>

    return (
        <div className="center">


<Heading size="lg">Active challenge</Heading>
            {myChallenge ?  (<Challenges challenges={[myChallenge]} address={address} signer={signer} />) :
             (<Challenges challenges={currentChallenges} address={address} signer={signer} showAccept={true}/>) 
            }
            
            { oldChallenges.length > 0 &&
              <>
              <Heading size="lg">Old challenges</Heading>
              <Challenges challenges={oldChallenges} address={address} signer={signer} />
              </>
            }

            { myOldChallenges.length > 0 &&
              <>
              <Heading size="lg">My History</Heading>
              <Challenges challenges={myOldChallenges} address={address} signer={signer} />
              </>
            }
       

            <Button {...buttonProps} onClick={getChallenges} colorScheme="blue">Update Challenges</Button>
        </div>
    )
}

export default ListChallenges