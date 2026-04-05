package github

// Analysis represents a Code Scanning analysis from the GitHub API.
type Analysis struct {
	ID           int    `json:"id"`
	Ref          string `json:"ref"`
	CommitSHA    string `json:"commit_sha"`
	AnalysisKey  string `json:"analysis_key"`
	Environment  string `json:"environment"`
	Category     string `json:"category"`
	Error        string `json:"error"`
	CreatedAt    string `json:"created_at"`
	ResultsCount int    `json:"results_count"`
	RulesCount   int    `json:"rules_count"`
	SarifID      string `json:"sarif_id"`
	URL          string `json:"url"`
	Deletable    bool   `json:"deletable"`
	Warning      string `json:"warning"`
	Tool         Tool   `json:"tool"`
}

// Tool represents a code scanning tool.
type Tool struct {
	Name    string  `json:"name"`
	GUID    *string `json:"guid"`
	Version string  `json:"version"`
}

// Alert represents a Code Scanning alert from the GitHub API.
type Alert struct {
	Number             int           `json:"number"`
	CreatedAt          string        `json:"created_at"`
	URL                string        `json:"url"`
	HTMLURL            string        `json:"html_url"`
	State              string        `json:"state"`
	FixedAt            *string       `json:"fixed_at"`
	DismissedBy        *User         `json:"dismissed_by"`
	DismissedAt        *string       `json:"dismissed_at"`
	DismissedReason    *string       `json:"dismissed_reason"`
	DismissedComment   *string       `json:"dismissed_comment"`
	Rule               Rule          `json:"rule"`
	Tool               Tool          `json:"tool"`
	MostRecentInstance AlertInstance `json:"most_recent_instance"`
	InstancesURL       string        `json:"instances_url"`
}

// Rule represents a code scanning rule.
type Rule struct {
	ID                    string   `json:"id"`
	Name                  string   `json:"name"`
	Severity              string   `json:"severity"`
	SecuritySeverityLevel string   `json:"security_severity_level,omitempty"`
	Description           string   `json:"description"`
	FullDescription       string   `json:"full_description,omitempty"`
	Tags                  []string `json:"tags"`
	Help                  string   `json:"help,omitempty"`
	HelpURI               string   `json:"help_uri,omitempty"`
}

// AlertInstance represents a single instance of an alert.
type AlertInstance struct {
	Ref             string          `json:"ref"`
	AnalysisKey     string          `json:"analysis_key"`
	Environment     string          `json:"environment"`
	Category        string          `json:"category"`
	State           string          `json:"state"`
	CommitSHA       string          `json:"commit_sha"`
	Message         InstanceMessage `json:"message"`
	Location        Location        `json:"location"`
	Classifications []string        `json:"classifications"`
}

// InstanceMessage is the message text for an alert instance.
type InstanceMessage struct {
	Text string `json:"text"`
}

// Location represents a code location in the source.
type Location struct {
	Path        string `json:"path"`
	StartLine   int    `json:"start_line"`
	EndLine     int    `json:"end_line"`
	StartColumn int    `json:"start_column"`
	EndColumn   int    `json:"end_column"`
}

// User represents a GitHub user.
type User struct {
	Login string `json:"login"`
	ID    int    `json:"id"`
}
