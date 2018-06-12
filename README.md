# Callo
Experiment with phone-call styled Minimal Stateful HTTP requests, with call styles inspired by Meteor Methods.
This package is still at its VERY EARLY development state, so it is highly unstable.

## Introduction
We all know that HTTP is a stateless protocol. This attribute is indeed very nice.
But occasionally we still need to maintain states. One way of solving it is by saving the state at server side in some database, and set a cookie for session ID to the client.

However, a minor trouble is when a request is