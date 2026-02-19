echo ------------------------------------------------------------------------------------
echo - Ensure claude is up-to-date                                                      -
echo ------------------------------------------------------------------------------------
brew upgrade claude claude-code
echo ------------------------------------------------------------------------------------
echo - Creating env vars                                                                -
echo ------------------------------------------------------------------------------------
export DISABLE_AUTOUPDATER=true
export FORCE_AUTOUPDATE_PLUGINS=true
export AUGMENT_API_TOKEN=_464e4f35a427ef638f799e698d41cf1f
export AUGMENT_API_URL=https://d16.api.augmentcode.com
export CONTEXT7_API_KEY=ctx7sk-efe01c2c-53d7-432c-8b9c-e48b45c154f9
echo - Setting up MCP                                                                   -
echo ------------------------------------------------------------------------------------
#claude mcp add context7 -- npx -y @upstash/context7-mcp
claude mcp add --header "CONTEXT7_API_KEY: $CONTEXT7_API_KEY" --transport http context7 https://mcp.context7.com/mcp
claude mcp add memorygraph -- memorygraph
echo ------------------------------------------------------------------------------------
claude mcp list
echo ------------------------------------------------------------------------------------
echo - Set up claude plugin marketplaces                                                -
echo ------------------------------------------------------------------------------------
claude plugin marketplace add anthropics/claude-code
claude plugin marketplace add anthropics/claude-plugins-official
#claude plugin marketplace add affaan-m/everything-claude-code
echo ------------------------------------------------------------------------------------
echo - Reinstall baseline plugins required                                            -
echo ------------------------------------------------------------------------------------
claude plugin install swift-lsp@claude-plugins-official
claude plugin enable swift-lsp@claude-plugins-official
claude plugin install typescript-lsp@claude-plugins-official
claude plugin enable typescript-lsp@claude-plugins-official
claude plugin install pyright-lsp@claude-plugins-official
claude plugin enable pyright-lsp@claude-plugins-official
claude plugin install kotlin-lsp@claude-plugins-official
claude plugin enable kotlin-lsp@claude-plugins-official
claude plugin install gopls-lsp@claude-plugins-official
claude plugin enable gopls-lsp@claude-plugins-official
claude plugin install firebase@claude-plugins-official
claude plugin enable firebase@claude-plugins-official
claude plugin install commit-commands
claude plugin enable commit-commands
claude plugin install ralph-wiggum
claude plugin enable ralph-wiggum
claude plugin install code-review
claude plugin enable code-review
claude plugin install feature-dev
claude plugin enable feature-dev
claude plugin install frontend-design
claude plugin enable frontend-design
claude plugin install security-guidance
claude plugin enable security-guidance
#claude plugin install explanatory-output-style
#claude plugin enable explanatory-output-style
#claude plugin install learning-output-style
#claude plugin enable learning-output-style
#claude plugin install everything-claude-code
#claude plugin enable everything-claude-code
echo ------------------------------------------------------------------------------------
echo - Start claude with all the doodads setup correctly                                -
echo ------------------------------------------------------------------------------------
claude --chrome --dangerously-skip-permissions
