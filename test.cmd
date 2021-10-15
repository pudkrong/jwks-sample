curl -XGET http://localhost:3000/.well-known/sign
curl -XGET http://localhost:3000/.well-known/jwks.json

curl -XPOST http://localhost:3000/.well-known
curl -XPOST http://localhost:3000/.well-known/verify -H "content-type: application/json" -d '{"payload":""}'
curl -XPOST http://localhost:3000/.well-known/clean

curl -XDELETE http://localhost:3000/.well-known/