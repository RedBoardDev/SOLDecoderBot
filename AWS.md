# dynamo DB

## create aws settings table

```shell
aws dynamodb create-table \
  --table-name soldecoderbot-settings \
  --attribute-definitions AttributeName=guildId,AttributeType=S \
  --key-schema AttributeName=guildId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## create aws wallets table

```shell
aws dynamodb create-table \
  --table-name soldecoderbot-wallets \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=channelId,AttributeType=S \
    AttributeName=summaryDaily,AttributeType=N \
    AttributeName=summaryWeekly,AttributeType=N \
    AttributeName=summaryMonthly,AttributeType=N \
    AttributeName=notifyOnClose,AttributeType=N \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes '[
    {
      "IndexName":"ByChannel",
      "KeySchema":[
        {"AttributeName":"channelId","KeyType":"HASH"},
        {"AttributeName":"SK","KeyType":"RANGE"}
      ],
      "Projection":{"ProjectionType":"ALL"}
    },
    {
      "IndexName":"DailyIndex",
      "KeySchema":[{"AttributeName":"summaryDaily","KeyType":"HASH"}],
      "Projection":{"ProjectionType":"INCLUDE","NonKeyAttributes":["PK","SK","channelId","threshold","notifyOnClose"]}
    },
    {
      "IndexName":"WeeklyIndex",
      "KeySchema":[{"AttributeName":"summaryWeekly","KeyType":"HASH"}],
      "Projection":{"ProjectionType":"INCLUDE","NonKeyAttributes":["PK","SK","channelId","threshold","notifyOnClose"]}
    },
    {
      "IndexName":"MonthlyIndex",
      "KeySchema":[{"AttributeName":"summaryMonthly","KeyType":"HASH"}],
      "Projection":{"ProjectionType":"INCLUDE","NonKeyAttributes":["PK","SK","channelId","threshold","notifyOnClose"]}
    },
    {
      "IndexName":"NotifyOnCloseIndex",
      "KeySchema":[{"AttributeName":"notifyOnClose","KeyType":"HASH"}],
      "Projection":{"ProjectionType":"INCLUDE","NonKeyAttributes":["PK","SK","channelId","threshold"]}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST
```
