// src/components/ErrorBoundary.jsx
import React from "react";
import Error500 from "../pages/Error500.jsx";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
    this.retry = this.retry.bind(this);
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    // log if you have analytics/Sentry here
    console.error("ErrorBoundary caught:", err, info);
  }
  retry() {
    this.setState({ err: null });
  }
  render() {
    if (this.state.err) return <Error500 error={this.state.err} onRetry={this.retry} />;
    return this.props.children;
  }
}
