import {useState} from "react";
import {Button, useToast, Select, Heading} from '@chakra-ui/react'
import { generateCommitment } from "./util"
import { submitTransaction } from "./CartesiTransaction";


function CreateChallenge ({signer}) {
    const [choice, setChoice] = useState<number>(1)
    const [loading, setLoading] = useState(false)
    const toast = useToast()

    async function sendTransaction(): Promise<any> {
        const commitment = await generateCommitment(choice, signer)

        console.log(`Commitment is ${commitment}`)

        let payload:any = {
            "method": "create_challenge",
            "commitment": commitment
        }

        return submitTransaction(payload, signer)
        
    }

    async function createChallenge() {
        toast({
            title: "Transaction sent",
            description: "waiting for confirmation",
            status: "success",
            duration: 9000,
            isClosable: true,
            position: "top-left"
        })

        console.log("Sending transaction")

        const response = await sendTransaction()

        console.log(response)

        if(response.id) {
            toast({
                title: "Confirmed",
                description: `Challenge created successfully`,
                status: "success",
                duration: 9000,
                isClosable: true,
                position: "top-left"
            })
        } else {
            toast({
                title: "Error",
                description: `Challenge was not created`,
                status: "error",
                duration: 9000,
                isClosable: true,
                position: "top-left"
            })
        }

        console.log(response.data) // will print the backend response as json
        

    }

    async function handleSubmit(event) {
        event.preventDefault()
        setLoading(true)
        await createChallenge()
        setLoading(false)
    }

    let buttonProps:any = {}
    if(loading) buttonProps.isLoading = true

    return (<div className="challendeForm">

        <form onSubmit={handleSubmit}>
            <Heading size="lg">CreateChallenge</Heading>
            <div>
                <label>Choice</label>
                <Select
                    focusBorderColor="yellow"
                    size="md"
                    value={choice}
                    onChange={(event) => setChoice(parseInt(event.target.value))}
                >
                    <option value="1">ROCK</option>
                    <option value="2">PAPER</option>
                    <option value="3">SCISSORS</option>
                </Select>
            </div>
            <Button {...buttonProps} type="submit" colorScheme={"yellow"}>
                Create Challenge
            </Button>
        </form>
    </div>)
}

export default CreateChallenge