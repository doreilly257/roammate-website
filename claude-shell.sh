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
echo - Setting up MCP                                                                   -
echo ------------------------------------------------------------------------------------
npm install -g @augmentcode/auggie@latest
auggie login
claude mcp add-json auggie --scope user '{"type":"stdio","command":"auggie","args":["--mcp","--mcp-auto-workspace"],"env":{"AUGMENT_API_TOKEN":"your-access-token","AUGMENT_API_URL":"your-tenant-url"}}'
claude mcp add context7 -- npx -y @upstash/context7-mcp
#claude mcp add memorygraph -- memorygraph
echo ------------------------------------------------------------------------------------
claude mcp list
echo ------------------------------------------------------------------------------------
echo - Set up claude plugin marketplaces                                                -
echo ------------------------------------------------------------------------------------
claude plugin marketplace add anthropics/claude-code
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin marketplace add affaan-m/everything-claude-code
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
claude plugin install explanatory-output-style
claude plugin enable explanatory-output-style
claude plugin install learning-output-style
claude plugin enable learning-output-style
claude plugin install everything-claude-code
claude plugin enable everything-claude-code
echo ------------------------------------------------------------------------------------
echo - Start claude with all the doodads setup correctly                                -
echo ------------------------------------------------------------------------------------
claude --chrome --dangerously-skip-permissions
