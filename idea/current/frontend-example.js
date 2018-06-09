import $C from 'callo';
const api = $C.endpoint('/protected-api');

// always sent as part of props no matter what
// unless overwritten by props
api.jar = {
  token: localStorage.getItem('token'),
};

// Save this api to redux

import { connect } from 'react-redux';

class App extends React.Component {
  constructor(props) {
    super(props);

    const {
      api,
    } = props;

    this.state = {
      shouldDisplayLoginForm: false,
      session: api.spawn(),
      sessionPaused: false,
      history: '',
    };
  }

  componentDidMount() {
    if (!this.props.api.jar.token) {
      this.setState({
        shouldDisplayLoginForm: true,
      });
    }
  }

  handleLogin = () => {
    const session = this.state.session;

    this.props.updateJar({
      username: this.state.username,
      password: this.state.password,
    });

    if (session.requireAction()) {

    }
  };

  getHistory = () => {
    const {
      session,
    } = this.state;
    (async function () {
      await session.dial('getHistory');

      if (session.requireAction() && session.actionType() === 'REQUIRE_USERNAME_PASSWORD') {
        this.setState({
          shouldDisplayLoginForm: true,
        })
      } else if (session.isDone()) {
        this.setState({
          history: session.data.history,
        });
      }
    })();
  };

  render() {
    return (
      <div>
        {this.state.shouldDisplayLoginForm &&
          <div>
            <input type="text"
                   value={this.state.username}
                   onChange={(e) => this.setState({ username: e.target.value })}/>
            <input type="text"
                   value={this.state.password}
                   onChange={(e) => this.setState({ password: e.target.value })}/>
            <button onClick={this.handleLogin}>LOGIN</button>
          </div>
        }
        <button onClick={this.getHistory}>Get History</button>
        <span>{ this.state.history }</span>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    api: state.api,
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    updateJar: (newJar) => dispatch(updateJar(newJar))
  }
};

export default connect(mapStateToProps, mapDispatchToProps)(App)






const session = api.spawn();

function getHistory() {

}

(async () => {
  await session.dial('getHistory', {
    startDate: '2018-01-01',
  });

  while (session.hasOrder()) {
    switch (session.orderType()) {
      case
    }
  }
})();