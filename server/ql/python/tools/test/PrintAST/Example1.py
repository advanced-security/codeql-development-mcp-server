# Example1 test case for PrintAST.ql
import sys

class Example1:
    def __init__(self, name="World"):
        self.name = name
    
    def greet(self):
        message = f"Hello, {self.name}!"
        print(message)
    
    @staticmethod
    def main(args=None):
        # $Example1
        
        if args is None:
            args = sys.argv[1:]
        
        # Create instance
        example = Example1()
        
        # Check arguments
        if len(args) > 0:
            example.name = args[0]
        
        # Call method
        example.greet()
        
        # Simple loop
        numbers = [1, 2, 3]
        for num in numbers:
            print(num * 2)
        
        # Exception handling
        try:
            result = 10 / 0
        except ZeroDivisionError:
            print("Cannot divide by zero")

def helper():
    return "Helper"

if __name__ == "__main__":
    Example1.main()
