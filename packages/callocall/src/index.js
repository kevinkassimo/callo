if (typeof window === 'undefined') {
  require('babel-polyfill');
  require('isomorphic-fetch');
}

let Callo = (function() {
  const constants = {
    handleTypes: {
      END: '$$CALLO_END',
      ORDER: '$$CALLO_ORDER',
      ORDER_REWIND: '$$CALLO_ORDER_REWIND',
      ORDER_JUMP: '$$CALLO_ORDER_JUMP',

      REWIND: '$$CALLO_REWIND',
      JUMP: '$$CALLO_JUMP',
      NEXT: '$$CALLO_NEXT',

      UNKNOWN: '$$CALLO_UNKNOWN',
    },

    reserved: {
      FLOW_ID: '$$FLOW_ID',
    },
  };

  class CalloSession {
    constructor(endpoint) {
      this.endpoint = endpoint;
      this.jar = {};

      this.error = null;
      this.action = null;
      this.data = null;

      this._state = null;
    }

    dial = async (name, props, fetchSettings) => {
      // If there is a previous stuff, discard them
      this.clear();

      let combinedProps;
      if (props) {
        combinedProps = { ...this.propsJar, ...props };
      } else {
        combinedProps = { ...this.propsJar };
      }

      const body = {
        name,
        props: combinedProps,
      };
      let jsonBody;
      try {
        jsonBody = JSON.stringify(body);
      } catch (err) {
        throw new Error('cannot create proper body');
      }

      try {
        let headers = {};
        if (fetchSettings && fetchSettings.headers) {
          headers = { ...headers, ...fetchSettings.headers };
        }
        headers = { ...headers, 'Content-Type': 'application/json' };

        console.log(jsonBody);

        let req = await fetch(this.endpoint, {
          ...fetchSettings,
          headers,
          method: 'POST',
          body: jsonBody
        });

        let respObject = await req.json();

        if (respObject.action) {
          this.action = respObject.action;
        }
        if (respObject.data) {
          this.data = respObject.data;
        }
        if (respObject.error) {
          this.error = respObject.error;
        }
        if (respObject.state) {
          this._state = respObject.state;
        }

        if (respObject.action === constants.handleTypes.END) {
          this._state = null;
          this.error = null;
          this.action = null;
          // Keep data, just in case
        }

        return respObject.data;
      } catch (err) {
        throw err;
        // throw new Error('dial failed');
      }
    };

    reply = async (props, fetchSettings) => {
      if (!this._state) {
        throw new Error('Nothing to reply to');
      }

      let combinedProps;
      if (props) {
        combinedProps = { ...this.propsJar, ...props };
      } else {
        combinedProps = { ...this.propsJar };
      }

      const body = {
        props: combinedProps,
        state: this._state,
      };
      let jsonBody;
      try {
        jsonBody = JSON.stringify(body);
      } catch (err) {
        throw new Error('cannot create proper body');
      }

      try {
        let headers = {};
        if (fetchSettings && fetchSettings.headers) {
          headers = { ...headers, ...fetchSettings.headers };
        }
        headers = { ...headers, 'Content-Type': 'application/json' };

        let req = await fetch(this.endpoint, {
          ...fetchSettings,
          headers,
          method: 'POST',
          body: jsonBody
        });

        let respObject = await req.json();

        if (respObject.action) {
          this.action = respObject.action;
        }
        if (respObject.data) {
          this.data = respObject.data;
        }
        if (respObject.error) {
          this.error = respObject.error;
        }

        if (respObject.action === constants.handleTypes.END) {
          this._state = null;
          this.error = null;
          this.action = null;
          // Keep data, just in case
        }

        return respObject.data;
      } catch (err) {
        throw new Error('dial failed');
      }
    };

    clear() {
      this._state = null;
      this.error = null;
      this.action = null;
      this.data = null;
    }

    hasError = () => {
      return !!this.error;
    };

    hasAction = () => {
      return !!this.action;
    }
  }

  return {
    session(endpoint) {
      return new CalloSession(endpoint);
    },
  }
})();

if (module) {
  module.exports = Callo;
}
