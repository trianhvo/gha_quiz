# GHA Exam Quiz Application

This project is a simple quiz test application designed for practice and testing purposes. It utilizes Vite for deployment and is structured to provide a user-friendly interface for answering quiz questions.

## Project Structure

The project is organized as follows:

```
gha_exam
├── src
│   ├── main.js                # Entry point of the application
│   ├── components             # Contains React components for the quiz interface
│   │   ├── QuizInterface.js   # Manages the overall quiz interface
│   │   ├── QuestionDropdown.js # Dropdown for selecting questions
│   │   └── QuestionDisplay.js  # Displays the current question and choices
│   ├── utils                  # Utility functions for loading questions and local storage
│   │   ├── questionLoader.js   # Loads questions from Markdown files
│   │   └── localStorage.js     # Handles local storage operations
│   ├── styles                 # CSS styles for the application
│   │   └── main.css           # Main stylesheet
│   └── data                   # Contains question bank
│       └── questions
│           └── actions        # Markdown files for questions
├── public
│   └── index.html             # Main HTML template for the application
├── package.json               # npm configuration file
├── vite.config.js             # Vite configuration file
└── README.md                  # Project documentation
```

## Features

- **Practice Tab**: Users can answer questions one by one in order. 
- **Question Selection**: A dropdown menu allows users to select questions by their order.
- **Answer Submission**: After submitting an answer, the correct answer is highlighted in green, and incorrect answers are highlighted in red. A popup displays the correct answer and a link for more information.
- **Marking Questions**: Users can mark questions to revisit later, with options to save to local storage or clear saved data.

## Getting Started

To run the application locally, follow these steps:

1. Clone the repository:
   ```
   git clone <repository-url>
   cd gha_exam
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000` to view the application.

## Usage

- Navigate to the **Practice** tab to start answering questions.
- Use the dropdown to select a question.
- Submit your answer to see feedback and additional information.
- Mark questions for later review as needed.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.