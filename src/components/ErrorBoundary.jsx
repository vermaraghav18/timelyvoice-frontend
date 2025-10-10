import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('UI error:', err, info); }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24 }}>Something went wrong. Try refreshing the page.</div>;
    }
    return this.props.children;
  }
}
