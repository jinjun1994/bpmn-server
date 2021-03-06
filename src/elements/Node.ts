import { Element, Flow } from '.';

import { Execution } from '../engine/Execution';
import { Token } from '../engine/Token';
import { IBehaviour, Behaviour} from "./behaviours";
import { NODE_ACTION, FLOW_ACTION, EXECUTION_EVENT, TOKEN_STATUS, ITEM_STATUS, INode } from '../../';
import { Item } from '../engine/Item';
import { BPMN_TYPE } from './NodeLoader';
import { BehaviourLoader } from './behaviours/BehaviourLoader';

// ---------------------------------------------
class Node extends Element {
    name;
    processId;
    def;
    outbounds: Flow[];
    inbounds: Flow[];
    attachments: Node[];
    attachedTo: Node;
    messageId;
    signalId;
    scripts = new Map();

    constructor(id, processId, type, def) {
        super();
        this.id = id;
        this.processId = processId;
        this.type = type;
        this.def = def;
        this.inbounds = [];
        this.outbounds = [];
        this.name = def.name;
        this.attachments = [];

        BehaviourLoader.load(this);
    }
    async doEvent(item: Item, event: EXECUTION_EVENT, newStatus: ITEM_STATUS) {
        if (newStatus)
            item.status = newStatus;
        item.token.log('..>' + event + ' ' + this.id);
        const script = this.scripts.get(event);
        if (script) {
            await item.token.execution.appDelegate.scopeJS(item, script);
        }
        return await item.token.execution.doItemEvent(item, event);

    }
    /**
     * transform data using input rules
     * todo
     * @param item
     */
    async setInput(item: Item, input) {

        //
        item.token.log('--setting input ' + JSON.stringify(input));

        const data = this.getInput(item, input);

        item.token.applyInput(data);

    }
    async getInput(item: Item, input) {

        item.context.response.input = input;

        await this.doEvent(item, EXECUTION_EVENT.transform_input, null);

        return item.context.response.input;
    }
    /**
     * transform data using output rules
     * todo
     * @param item
     */
    async getOutput(item: Item) {
        item.context.response.output = item.data;
        item.context.response.messageMatchingKey = {};

        await this.doEvent(item, EXECUTION_EVENT.transform_output, null);

        return item.context.response.output;

    }
    enter(item: Item) {
        item.startedAt = new Date().toISOString();;

    }
    /*
     * does the need require to go into wait 
     * tasks like UserTasks, receiveTask, timer 
     */
    get requiresWait() { return false; }
    /* 
     * Can the Node be invoked externally (not from the workflow)
     * tasks like UserTasks, receiveTask, or events like receive,signal can be invoked
     */
    get canBeInvoked() { return false; }

    get isCatching(): boolean { return false; } // catching events and tasks
    /**
     * this is the primary exectuion method for a node
     * 
     * considerations: the following are handled by Token
     *      1.  Loops we are inside a loop already (if any)
     *      2.  Gatways 
     *      3.  Subprocess the parent node is fired as normal
     *              run method will fire the subprocess invoking a new token and will go into wait
     */
    async execute(item: Item) {


        //  2  enter
        //  --------
        await this.doEvent(item, EXECUTION_EVENT.node_enter, ITEM_STATUS.enter);

        this.enter(item);   // no choice

        //  3   start
        //  --------

        await this.doEvent(item, EXECUTION_EVENT.node_start, ITEM_STATUS.start);

        let ret =await this.start(item);

        let wait = ret == NODE_ACTION.wait;
        this.behaviours.forEach(b => {
            if (b.start(item) == NODE_ACTION.wait) {
                item.token.log("..behaviour returned wait");
                wait = true;
            }

        });
        // check for attachments - boundary events:
        let i;
        for (i = 0; i < this.attachments.length; i++) {
            let event = this.attachments[i];
            item.token.log('..executing boundary event -' + event.id);
            await Token.startNewToken(item.token.execution, event, null, item.token, this, null);
            item.token.log('..executing boundary event -' + event.id + ' ended');
        }
        if (wait) {
            await this.doEvent(item, EXECUTION_EVENT.node_wait, ITEM_STATUS.wait);
            return NODE_ACTION.wait;
        }
        //  4   run  perform the work
        //  --------

        item.token.log('..>run ' + this.id);

        ret = await this.run(item);
        switch (ret) {
            case NODE_ACTION.error:
                return ret;
                break;
            case NODE_ACTION.abort:
                return ret;
                break;
        }
        //  5   continue    
        //  --------
        //          end

        return await this.continue(item);

    }
    /*
     *  called by execute or by token.invoke to continue work already started
     */
    async continue(item: Item) {

        await this.end(item);
        return;
    }

    async start(item: Item): Promise<NODE_ACTION> {

        if (this.requiresWait) {
            return NODE_ACTION.wait;
        }
        return NODE_ACTION.continue;
    }

    async run(item: Item): Promise<NODE_ACTION> {

        return NODE_ACTION.end;
    }
    async end(item: Item) {

        /// fire message flow
        /**
         * Rule:    boundary events are canceled when owner task status is 'end'
         * */
        // cancel boundary events
        let i,t;
        for (i = 0; i < this.attachments.length; i++) {
            let boundaryEvent = this.attachments[i];
            let childrenTokens = item.token.getChildrenTokens();
            for (t = 0; t < childrenTokens.length; t++) {
                let token = childrenTokens[t];
                if (token.startNodeId == boundaryEvent.id) {
                    await token.terminate();
                }
            }
        }

        for (i = 0; i < this.outbounds.length; i++) {
            let flow = this.outbounds[i];
                if (flow.type == BPMN_TYPE.MessageFlow) {
                    let flowItem = new Item(flow, item.token);
                    await flow.execute(flowItem);
                }
        }

        if (item.status == ITEM_STATUS.end)
            return;
        item.endedAt = new Date().toISOString();;
        this.behaviours.forEach(async function (b) { await b.end(item); });
        await this.doEvent(item, EXECUTION_EVENT.node_end, ITEM_STATUS.end);
    }
    /**
     * is called by the token after an execution resume for every active (in wait) item
     * different than init, which is called for all items
     * @param item
     */
    resume(item: Item) {

    }
    init(item: Item) {

    }
    /* to be overwritten by XOR gateway */

    getOutbounds(item: Item): Item[] {
        const outbounds = [];
        this.outbounds.forEach(flow => {
            if (flow.type == BPMN_TYPE.MessageFlow) {

            }
            else {
                let flowItem = new Item(flow, item.token);
                if (flow.run(flowItem) == FLOW_ACTION.take)
                    outbounds.push(flowItem);
            }
        });
        item.token.log('..return outbounds' + outbounds.length);
        return outbounds;
    }
}


export { Node}