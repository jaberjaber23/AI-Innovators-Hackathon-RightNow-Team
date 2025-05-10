import pandas as pd
import os
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import json
from typing import Dict, Any, List, Optional

# Load environment variables
load_dotenv()

# Initialize components
embeddings = OpenAIEmbeddings()
model = ChatOpenAI(model="gpt-4")

# Load the transactions data
csv_path = os.path.join(os.getcwd(), "pdfs", "jordan_transactions.csv")
transactions_df = pd.read_csv(csv_path)

# Convert date column to datetime
transactions_df['transaction_date'] = pd.to_datetime(transactions_df['transaction_date'], format='%d/%m/%Y %H:%M')

# Create a financial advisor prompt template
template = """
You are a Smart Financial Advisor specialized in analyzing retail transaction data from multiple mall locations in Jordan.
Your goal is to provide accurate, insightful analysis of financial transactions based on the data provided.

Question: {question}
Relevant Transaction Data:
{context}

Additional Statistics:
{statistics}

Please provide a comprehensive answer with specific data points to support your analysis.
If appropriate, suggest potential business actions based on the insights.
Answer:
"""

# Setup prompt template
prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model

def get_summary_statistics() -> str:
    """Generate summary statistics about the transaction data"""
    stats = {}
    
    # Total transactions by mall
    mall_counts = transactions_df['mall_name'].value_counts().to_dict()
    stats['transactions_by_mall'] = mall_counts
    
    # Total transaction amount by mall
    mall_amounts = transactions_df.groupby('mall_name')['transaction_amount'].sum().to_dict()
    stats['total_amount_by_mall'] = mall_amounts
    
    # Transaction status distribution
    status_counts = transactions_df['transaction_status'].value_counts().to_dict()
    stats['transaction_status_distribution'] = status_counts
    
    # Transaction types distribution
    type_counts = transactions_df['transaction_type'].value_counts().to_dict()
    stats['transaction_types'] = type_counts
    
    # Time-based analysis (transactions by month)
    transactions_df['month'] = transactions_df['transaction_date'].dt.month
    month_counts = transactions_df['month'].value_counts().sort_index().to_dict()
    stats['transactions_by_month'] = {f"Month {m}": count for m, count in month_counts.items()}
    
    return json.dumps(stats, indent=2)

def filter_transactions(query: str) -> pd.DataFrame:
    """Filter transactions based on the query"""
    filtered_df = transactions_df
    
    # Basic keyword filtering
    if "failed" in query.lower():
        filtered_df = filtered_df[filtered_df['transaction_status'] == 'Failed']
    if "success" in query.lower():
        filtered_df = filtered_df[filtered_df['transaction_status'] == 'Success']
    
    # Mall filtering
    for mall in ["Y Mall", "Z Mall", "C Mall"]:
        if mall.lower() in query.lower():
            filtered_df = filtered_df[filtered_df['mall_name'] == mall]
    
    # Date filtering - look for month keywords
    months = {
        "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12
    }
    for month_name, month_num in months.items():
        if month_name in query.lower():
            filtered_df = filtered_df[filtered_df['transaction_date'].dt.month == month_num]
    
    # Return a sample if the filtered dataset is too large
    if len(filtered_df) > 20:
        return filtered_df.sample(20)
    return filtered_df

def ask_from_csv(question: str) -> str:
    """
    Query and answer questions from the Jordan retail transaction data
    
    Parameters:
        question (str): The question asked by the user.
        
    Returns:
        str: The answer generated using analysis of transaction data.
    """
    # Filter relevant transactions
    filtered_transactions = filter_transactions(question)
    
    # Convert to string representation for context
    if len(filtered_transactions) > 0:
        context = filtered_transactions.to_string(index=False)
    else:
        context = "No transactions matching your query were found."
    
    # Get summary statistics
    statistics = get_summary_statistics()
    
    # Generate the answer
    result = chain.invoke({
        "question": question,
        "context": context,
        "statistics": statistics
    })
    
    return result.content
