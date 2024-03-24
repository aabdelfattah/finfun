# finfun
Fetch SP500 stock data from yfinance, assign them a score and publish it to an excel sheet named `TopRankedStocks` , optionally can also publish to a google sheet


# dependencies

Install the following python packages

```
pip3 install pygsheets
pip3 install yfinance --upgrade --no-cache-dir
pip3 install openpyxl
```

To access google sheets you need OAuthCredentials, this can be obtained following this [tutorial](https://pygsheets.readthedocs.io/en/latest/authorization.html). Afterwards, download the secret file and save it to the same project path as `client_secret.json`

Also you should create `FinFun` sheet into your google account.

# Running

`python3 finfun.py -r n`

where n is n ranked top stocks in a sector