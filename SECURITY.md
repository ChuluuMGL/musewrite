# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability, please follow these steps:

1. **Do not open a public issue**
2. Email us at security@example.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Possible impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Fix Development**: Varies by severity
- **Disclosure**: After fix is released

## Security Best Practices

### API Keys

- Never commit API keys to the repository
- Use environment variables for sensitive data
- Rotate keys regularly

```bash
# Set API keys via environment
export OPENAI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
```

### Data Protection

- Drafts may contain sensitive information
- Use `.gitignore` to prevent accidental commits
- Clean up drafts regularly

### Dependencies

We recommend running security audits regularly:

```bash
# Run security audit
npm run audit

# Fix vulnerabilities
npm run audit:fix
```

## Security Features

AI-Writer includes several security features:

- **Sensitive Word Filter**: Detects and filters potentially harmful content
- **Rate Limiting**: Prevents abuse of API endpoints
- **Input Validation**: Validates all user inputs
- **Error Handling**: Prevents information leakage through errors

## Dependency Security

We use the following tools to ensure dependency security:

- `npm audit` - Checks for known vulnerabilities
- Dependabot - Automated dependency updates
- Snyk (optional) - Advanced vulnerability scanning

## Disclosure Policy

We follow responsible disclosure:

1. Security issues are fixed privately
2. CVEs are assigned for significant vulnerabilities
3. Security advisories are published after fixes
4. Credit is given to reporters (if desired)
