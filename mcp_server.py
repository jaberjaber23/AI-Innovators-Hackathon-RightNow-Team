from mcp.server.fastmcp import FastMCP
from send_mail import send_email as raw_send_email
from rag_pipeline import ask_from_csv

# Auto open in port 8000
mcp = FastMCP(
    name="financial-advisor-mcp",
)

@mcp.tool()
def get_financial_analysis(question: str) -> str:
    """
       Query the Jordan retail transaction data and provide financial analysis
       
       Parameters:
           question (str): The finance-related question asked by the user.

       Returns:
           str: The answer with financial analysis based on the transaction data.
       """
    return ask_from_csv(question)

@mcp.tool()
def send_email(receiver: str, subject: str, body: str) -> str:
    """Send an email to a given recipient with a subject and message"""
    return raw_send_email(receiver, subject, body)

@mcp.tool()
def get_mall_summary() -> str:
    """Get a summary of all mall transaction statistics"""
    return ask_from_csv("Give me a summary of transactions across all malls")

@mcp.tool()
def get_transaction_anomalies() -> str:
    """Identify potential anomalies or unusual patterns in the transaction data"""
    return ask_from_csv("Identify any unusual transaction patterns or anomalies in the data")

@mcp.tool()
def generate_monthly_report(month: str) -> str:
    """Generate a financial performance report for a specific month"""
    return ask_from_csv(f"Generate a detailed financial report for {month}")

if __name__ == "__main__":
    print("Starting Financial Advisor MCP Server...")
    mcp.run(transport='sse')


