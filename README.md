# jwks-sample

## Prerequisition
- Mongo

  `docker run -d --rm --name mongo -p 27017:27017 mongo:3.6`

- Redis

  `docker run -d --rm --name redis -p 6379:6379 redis`

## How it works
- Once you setup everything you can start the express application 

  `npm start`
- You can test using the below set of requests

### Sign jwt token
- It will create new JWK if it does not have one yet
- If key exists, then it will use one

`curl -XGET http://localhost:3000/.well-known/sign`

### Verify jwt token

`curl -XPOST http://localhost:3000/.well-known/verify -H "content-type: application/json" -d '{"payload":"token"}'`

### Create new jwk (rotate)
- You can create new jwk whenever you want
- System will set the recently created one to default one onward

`curl -XPOST http://localhost:3000/.well-known`

### Get jwks.json

`curl -XGET http://localhost:3000/.well-known/jwks.json`

### Clean the old ones

`curl -XPOST http://localhost:3000/.well-known/clean`

## For the consumer
I have created sample client app to test. Just change `token` variable to jwt you just create

`node client.js`
