const express = require('express');
const passport = require('passport');
const router = express.Router();
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn()
const flash = require('connect-flash')
const request = require('request')
const Promise = require('bluebird')
const requestPromise = require('request-promise')

const env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL:
    process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
};

const checkLoggedIn = async (user) => {
  let userInfo
  if (user) {
    console.log(user.nickname)
    const lookUp = () => {
      return requestPromise({
        method: 'get',
        url: 'http://localhost:3000/api/user/' + user.nickname + "@gmail.com"
      }).then(result => {
        result = JSON.parse(result)
        return result[0].id
      }).catch(error => {
        console.log(error)
      })
    }
    const id = await lookUp()
    const portfolio = () => {
      return requestPromise({
        method: 'get',
        url: 'http://localhost:3000/api/portfolio/' + id
      }).then(result => {
        return result
      }).catch(error => {
        console.log(error)
      })
    }
    const ledger = () => {
      return requestPromise({
        method: 'get',
        url: 'http://localhost:3000/api/ledger/' + id
      }).then(result => {
        return result
      }).catch(error => {
        console.log(error)
      })
    }
    const getLedger = await ledger()

    const getPortfolio = await portfolio()
    const jsonPortfolio = JSON.parse(getPortfolio)
    let bb = JSON.parse(getLedger)
    let cc = await new Promise.map(bb, entry => {
      let cleaned = []
      let date = entry.createdAt
      let dateTrimmed = date.substring(0, date.indexOf('T'))
      let total = entry.stock_count * entry.purchase_price
      return {
        id: entry.id,
        symbol: entry.symbol,
        stock_count: entry.stock_count,
        purchase_price: entry.purchase_price,
        date: dateTrimmed,
        total_gain: total,
      }
    }).then((ledger) => {
      jsonPortfolio["Ledger"] = ledger
    })
     
    return jsonPortfolio
  }
}

/* GET home page. */
router.get('/', async (req, res, next) => {
  try {
    const port = await checkLoggedIn(req.user)
    res.render('index', port);
  } catch (e) {
    next(e)
  }
  
});

router.get('/login', passport.authenticate('auth0', {
  clientID: env.AUTH0_CLIENT_ID,
  domain: env.AUTH0_DOMAIN,
  redirectUri: env.AUTH0_CALLBACK_URL,
  responseType: 'code',
  audience: 'https://' + env.AUTH0_DOMAIN + '/userinfo',
  scope: 'openid profile'}),
  (req, res) => {
    res.redirect("/");
});

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

router.get('/callback',
  passport.authenticate('auth0', {
    failureRedirect: '/failure'
  }),
  (req, res) => {
    res.redirect(req.session.returnTo || '/');
  }
);


router.get('/failure', (req, res) => {
  let error = req.flash("error");
  let error_description = req.flash("error_description");
  req.logout();
  res.render('failure', {
    error: error[0],
    error_description: error_description[0],
  });
});

module.exports = router;
