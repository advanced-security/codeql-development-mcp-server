# Example1 test case for PrintAST.ql
require 'time'

class Example1
  # Class variables and constants
  @@count = 0
  GREETING = "Hello".freeze
  
  # Instance variables and accessor
  attr_accessor :name
  
  def initialize(name = "World")
    @name = name
    @@count += 1
  end
  
  def self.main(args = ARGV)
    # $Example1
    
    # Variable assignments
    example = Example1.new
    message = "#{GREETING}, #{example.name}!"
    length = message.length
    
    # Conditional statement
    if args.length > 0
      example.name = args[0]
    else
      puts message
    end
    
    # Case statement
    case Time.now.wday
    when 1
      puts "Monday"
    else
      puts "Other day"
    end
    
    # Loops
    example.demo_loops
    
    # Exception handling
    begin
      result = 10 / (args.empty? ? 1 : 0)
    rescue ZeroDivisionError => e
      puts "Error: #{e.message}"
    end
  end
  
  # Instance method
  def demo_loops
    numbers = [1, 2, 3]
    
    # For loop
    for i in 0...numbers.length
      print numbers[i]
    end
    puts
    
    # Each with block
    numbers.each { |n| print n * 2 }
    puts
    
    # While loop
    index = 0
    while index < 2
      print index
      index += 1
    end
    puts
    
    # Hash operations
    person = { name: @name, age: 25 }
    person.each do |key, value|
      puts "#{key}: #{value}"
    end
    
    # String and regex
    text = "Hello Ruby"
    if text.match?(/ruby/i)
      puts text.upcase
    end
  end
  
  # Class method
  def self.count
    @@count
  end
end

# Module
module Helper
  def helper_method
    "Helper"
  end
end

# Include module
class Example1
  include Helper
end

# Run if main file
if __FILE__ == $0
  Example1.main
end