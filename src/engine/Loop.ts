import { Token } from './Token';
import { Node, LoopBehaviour, Behaviour_names } from '../elements/';

import { Execution } from './Execution';

class Loop {
    id;
    node;
    ownerToken;
    definition: LoopBehaviour;
    sequence;
    dataPath;
    items: any[];
    completed;  // used to count # completed for parallel loops
    isSequential() { return (this.definition.isSequential()); }

    constructor(node: Node, token: Token, dataObject?: any) {

        this.node = node;
        this.ownerToken = token;

        if (dataObject) {
            this.id = dataObject.id;
            this.items = dataObject.items;
            this.completed = dataObject.completed;
            this.sequence = dataObject.sequence;
        }
        else {
            this.id = token.execution.getNewId('loop');
            this.definition = node.getBehaviour(Behaviour_names.LoopCharacteristics);
            const coll = this.definition.collection;
            token.log('loop collection:' + coll);
            this.completed = 0;

            this.items = token.execution.appDelegate.scopeEval(token.data, coll);
            this.dataPath = token.dataPath + '.'+this.node.id+'[]';
            this.sequence = 0;
        }
    }
    save() {
        return {
            id: this.id, nodeId: this.node.id, ownerTokenId: this.ownerToken.id, dataPath: this.dataPath,
//            items: this.items,
            completed: this.completed, sequence: this.sequence
        };
    }
    static load(execution, dataObject): Loop {

        let node = execution.getNodeById(dataObject.nodeId);
        let ownerToken = execution.getToken(dataObject.ownerTokenId);
        let loop = new Loop(node, ownerToken, dataObject);
        loop.dataPath = dataObject.dataPath;
        loop.sequence = dataObject.sequence;
        return loop;

    }
    getKeyName() {
        return 'loopKey';
    }
    isDone(): boolean {
        return (this.sequence > this.items.length - 1)
    }
    getNext() {
        if (this.isDone)
            return this.items[this.sequence++];
        else
            return null;
    }

    static async checkStart(token) {
        // loop
        const loopDefinition = token.currentNode.getBehaviour(Behaviour_names.LoopCharacteristics);
        if (loopDefinition) {
            if (loopDefinition.isSequential()) {
                // are we starting a new loop or continueing in an exiting one?
                if (token.loop) // already assigned a loop
                    return true; // go ahead and execute
                let loop = new Loop(token.currentNode, token);

                let seq = loop.getNext();
                let data = {};
                data[loop.getKeyName()] = seq;
                let newToken = await Token.startNewToken(token.execution, token.currentNode, loop.dataPath+'.'+seq, token, token.currentNode, loop, data);


                return false; // launching new token; stop this one

            }
            else { // parallel 
                // launch as many tokens as needed
                if (token.loop) // already assigned a loop
                    return true; // go ahead and execute
                let loop = new Loop(token.currentNode, token);
                let seq;
                for (seq = 0; seq < loop.items.length; seq++) {
                    let entry = loop.items[seq];
                    let data = {};
                    data[loop.getKeyName()] = entry;
                    let newToken = await Token.startNewToken(token.execution, token.currentNode, loop.dataPath + '.' + seq, token, token.currentNode, loop, data);
                }

                token.log('..loop: fired all tokens' + seq);
                return false; // launching new tokens; stop this one

            }
        }
        else
            return true; // continue with the normal logic 
    }
    static async checkNext(token: Token) {

        if (token.loop) {
            if (token.loop.isSequential()) {
                if (token.loop.isDone()) {

                    // need to converge here ;
                    token.end();
                    await token.parentToken.goNext();
                    return false;
                }
                else {
                    token.end();
                    let seq = token.loop.getNext();
                    let data = {};
                    data[token.loop.getKeyName()] = seq;
                    let newToken = await Token.startNewToken(token.execution, token.currentNode, token.loop.dataPath, token, token.currentNode, token.loop, data);


                    return false;
                }
            }
            else { // parallel 
                token.loop.completed++;
                token.end();
                if (token.loop.completed == token.loop.items.length) {
                    // need to converge here ;
                    await token.parentToken.goNext();
                }
                return false; // no further action

            }
        }
        return true; // continue with the normal logic 

    }

}
export {Loop}