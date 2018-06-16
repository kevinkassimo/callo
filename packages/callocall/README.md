# CalloCall Callo Frontend API Wrapper

## What is This?

This is the front-end API wrapper for Callo.

Its goal is to make it as easy to use as Meteor's Method.

## Simple Documentation

### Create a Session

```javascript
let sess = CalloCall.session('http://localhost:8000/');
```

### Add a Props Jar

```javascript
sess.jar = { alwaysSent: 'somedata' }; // these props are sent every call, unless explicitly overwritten. Feels like cookie in a way
```

### Initiate an API Call

```javascript
(async () => {
    let data = await sess.dial('login', { username: 'kevin', password: '123456' });
    // data could also be access through sess.data
    // You can also optionally add some fetch settings
    // CalloCall under the hood uses fetch
    /*
    let data = await sess.dial('login', {
    	username: 'kevin',
    	password: '123456'
    }, {
        credentials: 'same-origin',
    });
    */
})();
```

### Check Action and Reply

```javascript
(async () => {
	try {
		await sess.dial('login', { username: 'kevin', password: '123456' });
        switch (sess.action) {
            case 'INVALID_PASSWORD':
                sess.reply({ password: 'valid_password' });
                break;
            case 'INVALID_USERNAME':
                sess.reply({ username: 'real username', password: '123456' });
                break;
            default: // sess.action === null means done/error
                if (sess.error) {
                    console.log(sess.error);
                }
                console.log('done!', sess.data);
        }
    } catch (err) {
		console.log(err);
	}
})();
```