import l_f_csv as lf
import xml.etree.ElementTree as ET

l_f_param = {
    'tauRange': 2,
    'timeResolution': 1,
    'minSigni': 0.85,
    'tStepIntervall': 2,
    'maxDist': 10000,
    'dataset': 1,
}
print ("The intervall length is: " + str(l_f_param['tStepIntervall']))

list = lf.get_list(l_f_param)

for i in range(0, 5):
    print(list[i])
