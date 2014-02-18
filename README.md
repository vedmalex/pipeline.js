# pipeline.js
pipeline.js is modular pipeline like developer for node.js

# Main concept

Suppose we have *pipeline* with different types of *stages*.
*Stage* is the minimal work unit that can process some specific context. In pipeline the context is passing by specific stages that process the context, fulfill it with specific features. Some specific context can be splited into different parts and according its specific requirments it can be processed as well. After context is processed it is combined back into one context with specific rules.

Each stage can process specific context, that can be or not the part of something buggger. We can combine new type of pipeline by assembinlg it using the existing stages and pipelines that is stored in the warehouse.

the same idea is under the develop of pipeline

# Stages: quick overview

## Context
*Context* - is the thing that exists transparently in the system.
We can *fork* context, *getParent*, all errors during the processing of child context store in the parent error list.

## Stage
*Stage* is teh eventEmitter sublcass. We can either subscribe to events or use callback to catch-up end of processing.
*Stage* is by default asyncronous.

## Pipeline
*Pipeline* is by subclass of Stage. the main purpose of it is to run sequence of different stages one after another.

## IfElse
*IfElse* is the type of stage that use condition to choose which one of two *Stage* we need to run according to specific condition.

## MultiWaySwitch
*MultiWaySwitch* is more complex *Stage* than *IfElse* is.
we can provide each stage in the list with condition, by examining which *MultiWaySwitch* make decision wheather the specific stage can be run or not.
notable feature is that on context can be processed from 0 to n times with the *MultiWaySwitch*.

## Parallel
*Parallel* is the *Stage* that make possible process of stage that contain enumeration in it with parallel options. It runs one stage as parallel processing on series of data of the processing context.
it reachs end only after all data will be processed. It returns list of error, that can be examined when it will combine result into context.

## Sequential
*Sequential* is the *Stage* that work almost like *Parallel*, but it run stage in sequential manner. So it first error occures we can manage it to stop processing or continue if we decide that the error not significant.

