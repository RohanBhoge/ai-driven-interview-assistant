"""
# prompt = input("Ask Gemini: ")  # Get input from the user

# # Generate the response
# response = genai.generate_text(model=model, prompt=prompt)

# # Print the response from the model
# print(response.result)




"""

convo = model.start_chat()

prompt = "Start a JavaScript interview by asking just one simple, single-line question. After receiving the user's response, check if the answer is correct. If correct, proceed by asking the next question one at a time. If the user answers 2 questions incorrectly, ask if they want to continue or end the interview. Repeat the process with only one question at a time."

while True:
    newprompt = "ask next quation   "
    prompt = False
    if prompt != False:
        convo.send_message(prompt)
    else:
        convo.send_message(newprompt)
    print(convo.last.text)
    answer = input("Write your answer ")
