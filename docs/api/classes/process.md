[bpmn-server](../README.md) › [Process](process.md)

# Class: Process

## Hierarchy

* **Process**

## Index

### Constructors

* [constructor](process.md#constructor)

### Properties

* [childrenNodes](process.md#childrennodes)
* [def](process.md#def)
* [id](process.md#id)
* [isExecutable](process.md#isexecutable)
* [name](process.md#name)

### Methods

* [getStartNodes](process.md#getstartnodes)

## Constructors

###  constructor

\+ **new Process**(`definition`: any, `children`: any): *[Process](process.md)*

Defined in src/elements/Process.ts:16

**Parameters:**

Name | Type |
------ | ------ |
`definition` | any |
`children` | any |

**Returns:** *[Process](process.md)*

## Properties

###  childrenNodes

• **childrenNodes**: *[Node](node.md)[]*

Defined in src/elements/Process.ts:16

___

###  def

• **def**: *[Definition](definition.md)*

Defined in src/elements/Process.ts:15

___

###  id

• **id**: *any*

Defined in src/elements/Process.ts:12

___

###  isExecutable

• **isExecutable**: *any*

Defined in src/elements/Process.ts:14

___

###  name

• **name**: *any*

Defined in src/elements/Process.ts:13

## Methods

###  getStartNodes

▸ **getStartNodes**(`userInvokable`: boolean): *any[]*

Defined in src/elements/Process.ts:25

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`userInvokable` | boolean | false |

**Returns:** *any[]*
