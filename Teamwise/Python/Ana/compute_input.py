# compute_input.py

import sys
import json
import l_f_csv as lf  # Local file


# Read data from stdin
def read_in():
    lines = sys.stdin.readlines()
    # Since our input would only be having one line,
    # parse our JSON data from that
    return json.loads(lines[0])


def main():
    # get our data as an array from read_in()
    l_f_param = read_in()

    # print lines

    list = lf.get_list(l_f_param)

    # print ', '.join(list)
    # Writing in File dows not work!
    # with open('HALLOHALLO.csv', 'w', newline='') as csvfile:
    # the_writer = csv.writer(csvfile)
    # for i in range(0, len(list)):
    # print "Hello"
    # the_writer.writerow(list[i])

    print(list)


# start process
if __name__ == '__main__':
    main()
