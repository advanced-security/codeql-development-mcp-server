// Example1 test case for PrintAST.ql
class SomeClass {
    func f() {}
    func g(i: Int, j: Int) -> Int {
        return i + j
    }
}

func fun3(sc: SomeClass) {
    var i: Int
    sc.f()
    i = sc.g(i: 1, j: 2)
}
