# finfun
Fetch stock data from yfinance and publish it to a google sheet named `FinFun`

# dependencies

Install the following python packages

```
pip3 install pygsheets
pip3 install yfinance --upgrade --no-cache-dir
```

To access google sheets you need OAuthCredentials, this can be obtained following this [tutorial](https://pygsheets.readthedocs.io/en/latest/authorization.html). Afterwards, download the secret file and save it to the same project path as `client_secret.json`

Also you should create `FinFun` sheet into your google account.

# Running

Fill the stocks you are interested in into `stocks.json` then

`python3 finfun.py`
